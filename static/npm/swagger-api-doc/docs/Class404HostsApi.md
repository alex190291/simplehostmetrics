# NginxProxyManagerApi.Class404HostsApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**create404Host**](Class404HostsApi.md#create404Host) | **POST** /nginx/dead-hosts | Create a 404 Host
[**deleteDeadHost**](Class404HostsApi.md#deleteDeadHost) | **DELETE** /nginx/dead-hosts/{hostID} | Delete a 404 Host
[**disableDeadHost**](Class404HostsApi.md#disableDeadHost) | **POST** /nginx/dead-hosts/{hostID}/disable | Disable a 404 Host
[**enableDeadHost**](Class404HostsApi.md#enableDeadHost) | **POST** /nginx/dead-hosts/{hostID}/enable | Enable a 404 Host
[**getDeadHost**](Class404HostsApi.md#getDeadHost) | **GET** /nginx/dead-hosts/{hostID} | Get a 404 Host
[**getDeadHosts**](Class404HostsApi.md#getDeadHosts) | **GET** /nginx/dead-hosts | Get all 404 hosts
[**updateDeadHost**](Class404HostsApi.md#updateDeadHost) | **PUT** /nginx/dead-hosts/{hostID} | Update a 404 Host

<a name="create404Host"></a>
# **create404Host**
> InlineResponse2013 create404Host(body)

Create a 404 Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.Class404HostsApi();
let body = new NginxProxyManagerApi.NginxDeadhostsBody(); // NginxDeadhostsBody | 404 Host Payload

apiInstance.create404Host(body, (error, data, response) => {
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
 **body** | [**NginxDeadhostsBody**](NginxDeadhostsBody.md)| 404 Host Payload | 

### Return type

[**InlineResponse2013**](InlineResponse2013.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deleteDeadHost"></a>
# **deleteDeadHost**
> Object deleteDeadHost(hostID)

Delete a 404 Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.Class404HostsApi();
let hostID = null; // Object | 

apiInstance.deleteDeadHost(hostID, (error, data, response) => {
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

<a name="disableDeadHost"></a>
# **disableDeadHost**
> Object disableDeadHost(hostID)

Disable a 404 Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.Class404HostsApi();
let hostID = null; // Object | 

apiInstance.disableDeadHost(hostID, (error, data, response) => {
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

<a name="enableDeadHost"></a>
# **enableDeadHost**
> Object enableDeadHost(hostID)

Enable a 404 Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.Class404HostsApi();
let hostID = null; // Object | 

apiInstance.enableDeadHost(hostID, (error, data, response) => {
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

<a name="getDeadHost"></a>
# **getDeadHost**
> InlineResponse2013 getDeadHost(hostID)

Get a 404 Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.Class404HostsApi();
let hostID = null; // Object | 

apiInstance.getDeadHost(hostID, (error, data, response) => {
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

[**InlineResponse2013**](InlineResponse2013.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getDeadHosts"></a>
# **getDeadHosts**
> Object getDeadHosts(opts)

Get all 404 hosts

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.Class404HostsApi();
let opts = { 
  'expand': null // Object | Expansions
};
apiInstance.getDeadHosts(opts, (error, data, response) => {
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

<a name="updateDeadHost"></a>
# **updateDeadHost**
> InlineResponse2013 updateDeadHost(body, hostID)

Update a 404 Host

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.Class404HostsApi();
let body = new NginxProxyManagerApi.DeadhostsHostIDBody(); // DeadhostsHostIDBody | 404 Host Payload
let hostID = null; // Object | 

apiInstance.updateDeadHost(body, hostID, (error, data, response) => {
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
 **body** | [**DeadhostsHostIDBody**](DeadhostsHostIDBody.md)| 404 Host Payload | 
 **hostID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2013**](InlineResponse2013.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

