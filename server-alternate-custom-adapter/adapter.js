const utils = require('axios/lib/utils');
const settle = require('axios/lib/core/settle');
const buildURL = require('axios/lib/helpers/buildURL');
const http = require('http');
const https = require('https');
const httpFollow = require('follow-redirects').http;
const httpsFollow = require('follow-redirects').https;
const url = require('url');
const zlib = require('zlib');
const createError = require('axios/lib/core/createError');
const enhanceError = require('axios/lib/core/enhanceError');

/* eslint consistent-return:0 */
module.exports = function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolve, reject) {
    const { headers } = config;
    let { data } = config;

    // Set User-Agent (required by some servers)
    // Only set header if it hasn't been set in config
    // See https://github.com/axios/axios/issues/69
    if (!headers['User-Agent'] && !headers['user-agent']) {
      headers['User-Agent'] = 'axios - westeros';
    }

    if (data && !utils.isStream(data)) {
      if (Buffer.isBuffer(data)) {
        // Nothing to do...
      } else if (utils.isArrayBuffer(data)) {
        // eslint-disable-next-line no-buffer-constructor
        data = new Buffer(new Uint8Array(data));
      } else if (utils.isString(data)) {
        // eslint-disable-next-line no-buffer-constructor
        data = new Buffer(data, 'utf-8');
      } else {
        return reject(
          createError('Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream', config),
        );
      }

      // Add Content-Length header if data exists
      headers['Content-Length'] = data.length;
    }

    // HTTP basic authentication
    let auth;
    if (config.auth) {
      const username = config.auth.username || '';
      const password = config.auth.password || '';
      auth = `${username}:${password}`;
    }

    // Parse url
    const parsed = url.parse(config.url);
    const protocol = parsed.protocol || 'http:';

    if (!auth && parsed.auth) {
      const urlAuth = parsed.auth.split(':');
      const urlUsername = urlAuth[0] || '';
      const urlPassword = urlAuth[1] || '';
      auth = `${urlUsername}:${urlPassword}`;
    }

    if (auth) {
      delete headers.Authorization;
    }

    const isHttps = protocol === 'https:';
    const agent = isHttps ? config.httpsAgent : config.httpAgent;

    const options = {
      path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ''),
      method: config.method,
      headers,
      agent,
      auth,
    };

    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname;
      options.port = parsed.port;
    }

    let { proxy } = config;
    if (!proxy && proxy !== false) {
      const proxyEnv = `${protocol.slice(0, -1)}_proxy`;
      const proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
      if (proxyUrl) {
        const parsedProxyUrl = url.parse(proxyUrl);
        proxy = {
          host: parsedProxyUrl.hostname,
          port: parsedProxyUrl.port,
        };

        if (parsedProxyUrl.auth) {
          const proxyUrlAuth = parsedProxyUrl.auth.split(':');
          proxy.auth = {
            username: proxyUrlAuth[0],
            password: proxyUrlAuth[1],
          };
        }
      }
    }

    if (proxy) {
      const parsedPort = parsed.port ? `:${parsed.port}` : '';
      options.hostname = proxy.host;
      options.host = proxy.host;
      options.headers.host = `${parsed.hostname}${parsedPort}`;
      options.port = proxy.port;
      options.path = `${protocol}//${parsed.hostname}${parsedPort}${options.path}`;

      // Basic proxy authorization
      if (proxy.auth) {
        // eslint-disable-next-line no-buffer-constructor
        const base64 = new Buffer(`${proxy.auth.username}:${proxy.auth.password}`, 'utf8').toString('base64');
        options.headers['Proxy-Authorization'] = `Basic ${base64}`;
      }
    }

    let transport;
    if (config.transport) {
      // eslint-disable-next-line prefer-destructuring
      transport = config.transport;
    } else if (config.maxRedirects === 0) {
      transport = isHttps ? https : http;
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects;
      }
      transport = isHttps ? httpsFollow : httpFollow;
    }

    if (config.maxContentLength && config.maxContentLength > -1) {
      options.maxBodyLength = config.maxContentLength;
    }

    // Create the request
    const req = transport.request(options, function handleResponse(res) {
      if (req.aborted) return;

      // uncompress the response body transparently if required
      let stream = res;
      switch (res.headers['content-encoding']) {
        /* eslint default-case:0 */
        case 'gzip':
        case 'compress':
        case 'deflate':
          // add the unzipper to the body stream processing pipeline
          stream = stream.pipe(zlib.createUnzip());

          // remove the content-encoding in order to not confuse downstream operations
          delete res.headers['content-encoding'];
          break;
      }

      // return the last request in case of redirects
      const lastRequest = res.req || req;

      const response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        config,
        request: lastRequest,
      };

      if (config.responseType === 'stream') {
        response.data = stream;
        settle(resolve, reject, response);
      } else {
        const responseBuffer = [];
        stream.on('data', function handleStreamData(chunk) {
          responseBuffer.push(chunk);

          // make sure the content length is not over the maxContentLength if specified
          if (config.maxContentLength > -1 && Buffer.concat(responseBuffer).length > config.maxContentLength) {
            stream.destroy();
            reject(
              createError(`maxContentLength size of ${config.maxContentLength} exceeded`, config, null, lastRequest),
            );
          }
        });

        stream.on('error', function handleStreamError(err) {
          if (req.aborted) return;
          reject(enhanceError(err, config, null, lastRequest));
        });

        stream.on('end', function handleStreamEnd() {
          let responseData = Buffer.concat(responseBuffer);
          if (config.responseType !== 'arraybuffer') {
            responseData = responseData.toString('utf8');
          }

          response.data = responseData;
          settle(resolve, reject, response);
        });
      }
    });

    // Handle errors
    req.on('error', function handleRequestError(err) {
      if (req.aborted) return;
      reject(enhanceError(err, config, null, req));
    });

    // Handle request timeout
    if (config.timeout) {
      req.setTimeout(config.timeout, function handleRequestTimeout() {
        req.abort();
        reject(createError(`timeout of ${config.timeout}ms exceeded`, config, 'ECONNABORTED', req));
      });
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (req.aborted) return;

        req.abort();
        reject(cancel);
      });
    }

    // Send the request
    if (utils.isStream(data)) {
      data.pipe(req);
    } else {
      req.end(data);
    }
  });
};
