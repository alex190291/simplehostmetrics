# NginxProxyManagerApi.StreamsApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createStream**](StreamsApi.md#createStream) | **POST** /nginx/streams | Create a Stream
[**deleteStream**](StreamsApi.md#deleteStream) | **DELETE** /nginx/streams/{streamID} | Delete a Stream
[**disableStream**](StreamsApi.md#disableStream) | **POST** /nginx/streams/{streamID}/disable | Disable a Stream
[**enableStream**](StreamsApi.md#enableStream) | **POST** /nginx/streams/{streamID}/enable | Enable a Stream
[**getStream**](StreamsApi.md#getStream) | **GET** /nginx/streams/{streamID} | Get a Stream
[**getStreams**](StreamsApi.md#getStreams) | **GET** /nginx/streams | Get all streams
[**updateStream**](StreamsApi.md#updateStream) | **PUT** /nginx/streams/{streamID} | Update a Stream

<a name="createStream"></a>
# **createStream**
> InlineResponse2014 createStream(body)

Create a Stream

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.StreamsApi();
let body = new NginxProxyManagerApi.NginxStreamsBody(); // NginxStreamsBody | Stream Payload

apiInstance.createStream(body, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **body** | [**NginxStreamsBody**](NginxStreamsBody.md)| Stream Payload | 

### Return type

[**InlineResponse2014**](InlineResponse2014.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deleteStream"></a>
# **deleteStream**
> Object deleteStream(streamID)

Delete a Stream

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.StreamsApi();
let streamID = null; // Object | 

apiInstance.deleteStream(streamID, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **streamID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="disableStream"></a>
# **disableStream**
> Object disableStream(streamID)

Disable a Stream

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.StreamsApi();
let streamID = null; // Object | 

apiInstance.disableStream(streamID, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **streamID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="enableStream"></a>
# **enableStream**
> Object enableStream(streamID)

Enable a Stream

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.StreamsApi();
let streamID = null; // Object | 

apiInstance.enableStream(streamID, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **streamID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getStream"></a>
# **getStream**
> InlineResponse2014 getStream(streamID)

Get a Stream

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.StreamsApi();
let streamID = null; // Object | 

apiInstance.getStream(streamID, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **streamID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2014**](InlineResponse2014.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getStreams"></a>
# **getStreams**
> Object getStreams(opts)

Get all streams

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.StreamsApi();
let opts = { 
  'expand': null // Object | Expansions
};
apiInstance.getStreams(opts, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **expand** | [**Object**](.md)| Expansions | [optional] 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="updateStream"></a>
# **updateStream**
> InlineResponse2014 updateStream(body, streamID)

Update a Stream

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.StreamsApi();
let body = new NginxProxyManagerApi.StreamsStreamIDBody(); // StreamsStreamIDBody | Stream Payload
let streamID = null; // Object | 

apiInstance.updateStream(body, streamID, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **body** | [**StreamsStreamIDBody**](StreamsStreamIDBody.md)| Stream Payload | 
 **streamID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2014**](InlineResponse2014.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

