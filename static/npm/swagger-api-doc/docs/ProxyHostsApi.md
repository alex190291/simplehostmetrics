# NginxProxyManagerApi.ProxyHostsApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createProxyHost**](ProxyHostsApi.md#createProxyHost) | **POST** /nginx/proxy-hosts | Create a Proxy Host
[**deleteProxyHost**](ProxyHostsApi.md#deleteProxyHost) | **DELETE** /nginx/proxy-hosts/{hostID} | Delete a Proxy Host
[**disableProxyHost**](ProxyHostsApi.md#disableProxyHost) | **POST** /nginx/proxy-hosts/{hostID}/disable | Disable a Proxy Host
[**enableProxyHost**](ProxyHostsApi.md#enableProxyHost) | **POST** /nginx/proxy-hosts/{hostID}/enable | Enable a Proxy Host
[**getProxyHost**](ProxyHostsApi.md#getProxyHost) | **GET** /nginx/proxy-hosts/{hostID} | Get a Proxy Host
[**getProxyHosts**](ProxyHostsApi.md#getProxyHosts) | **GET** /nginx/proxy-hosts | Get all proxy hosts
[**updateProxyHost**](ProxyHostsApi.md#updateProxyHost) | **PUT** /nginx/proxy-hosts/{hostID} | Update a Proxy Host

<a name="createProxyHost"></a>
# **createProxyHost**
> InlineResponse2011 createProxyHost(body)

Create a Proxy Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ProxyHostsApi();
let body = new NginxProxyManagerApi.NginxProxyhostsBody(); // NginxProxyhostsBody | Proxy Host Payload

apiInstance.createProxyHost(body, (error, data, response) => {
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
 **body** | [**NginxProxyhostsBody**](NginxProxyhostsBody.md)| Proxy Host Payload | 

### Return type

[**InlineResponse2011**](InlineResponse2011.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deleteProxyHost"></a>
# **deleteProxyHost**
> Object deleteProxyHost(hostID)

Delete a Proxy Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ProxyHostsApi();
let hostID = null; // Object | 

apiInstance.deleteProxyHost(hostID, (error, data, response) => {
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

<a name="disableProxyHost"></a>
# **disableProxyHost**
> Object disableProxyHost(hostID)

Disable a Proxy Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ProxyHostsApi();
let hostID = null; // Object | 

apiInstance.disableProxyHost(hostID, (error, data, response) => {
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

<a name="enableProxyHost"></a>
# **enableProxyHost**
> Object enableProxyHost(hostID)

Enable a Proxy Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ProxyHostsApi();
let hostID = null; // Object | 

apiInstance.enableProxyHost(hostID, (error, data, response) => {
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

<a name="getProxyHost"></a>
# **getProxyHost**
> InlineResponse2011 getProxyHost(hostID)

Get a Proxy Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ProxyHostsApi();
let hostID = null; // Object | 

apiInstance.getProxyHost(hostID, (error, data, response) => {
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

[**InlineResponse2011**](InlineResponse2011.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getProxyHosts"></a>
# **getProxyHosts**
> Object getProxyHosts(opts)

Get all proxy hosts

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ProxyHostsApi();
let opts = { 
  'expand': null // Object | Expansions
};
apiInstance.getProxyHosts(opts, (error, data, response) => {
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

<a name="updateProxyHost"></a>
# **updateProxyHost**
> InlineResponse2011 updateProxyHost(body, hostID)

Update a Proxy Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ProxyHostsApi();
let body = new NginxProxyManagerApi.ProxyhostsHostIDBody(); // ProxyhostsHostIDBody | Proxy Host Payload
let hostID = null; // Object | 

apiInstance.updateProxyHost(body, hostID, (error, data, response) => {
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
 **body** | [**ProxyhostsHostIDBody**](ProxyhostsHostIDBody.md)| Proxy Host Payload | 
 **hostID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2011**](InlineResponse2011.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

