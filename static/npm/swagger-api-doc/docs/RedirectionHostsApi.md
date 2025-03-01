# NginxProxyManagerApi.RedirectionHostsApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createRedirectionHost**](RedirectionHostsApi.md#createRedirectionHost) | **POST** /nginx/redirection-hosts | Create a Redirection Host
[**deleteRedirectionHost**](RedirectionHostsApi.md#deleteRedirectionHost) | **DELETE** /nginx/redirection-hosts/{hostID} | Delete a Redirection Host
[**disableRedirectionHost**](RedirectionHostsApi.md#disableRedirectionHost) | **POST** /nginx/redirection-hosts/{hostID}/disable | Disable a Redirection Host
[**enableRedirectionHost**](RedirectionHostsApi.md#enableRedirectionHost) | **POST** /nginx/redirection-hosts/{hostID}/enable | Enable a Redirection Host
[**getRedirectionHost**](RedirectionHostsApi.md#getRedirectionHost) | **GET** /nginx/redirection-hosts/{hostID} | Get a Redirection Host
[**getRedirectionHosts**](RedirectionHostsApi.md#getRedirectionHosts) | **GET** /nginx/redirection-hosts | Get all Redirection hosts
[**updateRedirectionHost**](RedirectionHostsApi.md#updateRedirectionHost) | **PUT** /nginx/redirection-hosts/{hostID} | Update a Redirection Host

<a name="createRedirectionHost"></a>
# **createRedirectionHost**
> InlineResponse2012 createRedirectionHost(body)

Create a Redirection Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.RedirectionHostsApi();
let body = new NginxProxyManagerApi.NginxRedirectionhostsBody(); // NginxRedirectionhostsBody | Redirection Host Payload

apiInstance.createRedirectionHost(body, (error, data, response) => {
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
 **body** | [**NginxRedirectionhostsBody**](NginxRedirectionhostsBody.md)| Redirection Host Payload | 

### Return type

[**InlineResponse2012**](InlineResponse2012.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deleteRedirectionHost"></a>
# **deleteRedirectionHost**
> Object deleteRedirectionHost(hostID)

Delete a Redirection Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.RedirectionHostsApi();
let hostID = null; // Object | 

apiInstance.deleteRedirectionHost(hostID, (error, data, response) => {
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
 **hostID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="disableRedirectionHost"></a>
# **disableRedirectionHost**
> Object disableRedirectionHost(hostID)

Disable a Redirection Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.RedirectionHostsApi();
let hostID = null; // Object | 

apiInstance.disableRedirectionHost(hostID, (error, data, response) => {
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
 **hostID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="enableRedirectionHost"></a>
# **enableRedirectionHost**
> Object enableRedirectionHost(hostID)

Enable a Redirection Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.RedirectionHostsApi();
let hostID = null; // Object | 

apiInstance.enableRedirectionHost(hostID, (error, data, response) => {
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
 **hostID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getRedirectionHost"></a>
# **getRedirectionHost**
> InlineResponse2012 getRedirectionHost(hostID)

Get a Redirection Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.RedirectionHostsApi();
let hostID = null; // Object | 

apiInstance.getRedirectionHost(hostID, (error, data, response) => {
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
 **hostID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2012**](InlineResponse2012.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getRedirectionHosts"></a>
# **getRedirectionHosts**
> Object getRedirectionHosts(opts)

Get all Redirection hosts

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.RedirectionHostsApi();
let opts = { 
  'expand': null // Object | Expansions
};
apiInstance.getRedirectionHosts(opts, (error, data, response) => {
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

<a name="updateRedirectionHost"></a>
# **updateRedirectionHost**
> InlineResponse2012 updateRedirectionHost(body, hostID)

Update a Redirection Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.RedirectionHostsApi();
let body = new NginxProxyManagerApi.RedirectionhostsHostIDBody(); // RedirectionhostsHostIDBody | Redirection Host       Payload
let hostID = null; // Object | 

apiInstance.updateRedirectionHost(body, hostID, (error, data, response) => {
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
 **body** | [**RedirectionhostsHostIDBody**](RedirectionhostsHostIDBody.md)| Redirection Host       Payload | 
 **hostID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2012**](InlineResponse2012.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

