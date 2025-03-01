# NginxProxyManagerApi.TokensApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**refreshToken**](TokensApi.md#refreshToken) | **GET** /tokens | Refresh your access token
[**requestToken**](TokensApi.md#requestToken) | **POST** /tokens | Request a new access token from credentials

<a name="refreshToken"></a>
# **refreshToken**
> InlineResponse2007 refreshToken()

Refresh your access token

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.TokensApi();
apiInstance.refreshToken((error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters
This endpoint does not need any parameter.

### Return type

[**InlineResponse2007**](InlineResponse2007.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="requestToken"></a>
# **requestToken**
> InlineResponse2007 requestToken(body)

Request a new access token from credentials

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.TokensApi();
let body = new NginxProxyManagerApi.TokensBody(); // TokensBody | Credentials Payload

apiInstance.requestToken(body, (error, data, response) => {
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
 **body** | [**TokensBody**](TokensBody.md)| Credentials Payload | 

### Return type

[**InlineResponse2007**](InlineResponse2007.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

