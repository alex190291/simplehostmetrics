# NginxProxyManagerApi.AccessListsApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createAccessList**](AccessListsApi.md#createAccessList) | **POST** /nginx/access-lists | Create a Access List
[**deleteAccessList**](AccessListsApi.md#deleteAccessList) | **DELETE** /nginx/access-lists/{listID} | Delete a Access List
[**getAccessList**](AccessListsApi.md#getAccessList) | **GET** /nginx/access-lists/{listID} | Get a access List
[**getAccessLists**](AccessListsApi.md#getAccessLists) | **GET** /nginx/access-lists | Get all access lists
[**updateAccessList**](AccessListsApi.md#updateAccessList) | **PUT** /nginx/access-lists/{listID} | Update a Access List

<a name="createAccessList"></a>
# **createAccessList**
> InlineResponse2002 createAccessList(body)

Create a Access List

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.AccessListsApi();
let body = new NginxProxyManagerApi.NginxAccesslistsBody(); // NginxAccesslistsBody | Access List Payload

apiInstance.createAccessList(body, (error, data, response) => {
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
 **body** | [**NginxAccesslistsBody**](NginxAccesslistsBody.md)| Access List Payload | 

### Return type

[**InlineResponse2002**](InlineResponse2002.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deleteAccessList"></a>
# **deleteAccessList**
> Object deleteAccessList(listID)

Delete a Access List

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.AccessListsApi();
let listID = null; // Object | 

apiInstance.deleteAccessList(listID, (error, data, response) => {
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
 **listID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getAccessList"></a>
# **getAccessList**
> InlineResponse2002 getAccessList(listID)

Get a access List

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.AccessListsApi();
let listID = null; // Object | 

apiInstance.getAccessList(listID, (error, data, response) => {
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
 **listID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2002**](InlineResponse2002.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getAccessLists"></a>
# **getAccessLists**
> InlineResponse2002 getAccessLists(opts)

Get all access lists

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.AccessListsApi();
let opts = { 
  'expand': null // Object | Expansions
};
apiInstance.getAccessLists(opts, (error, data, response) => {
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

[**InlineResponse2002**](InlineResponse2002.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="updateAccessList"></a>
# **updateAccessList**
> InlineResponse2002 updateAccessList(body, listID)

Update a Access List

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.AccessListsApi();
let body = new NginxProxyManagerApi.AccesslistsListIDBody(); // AccesslistsListIDBody | Access List Payload
let listID = null; // Object | 

apiInstance.updateAccessList(body, listID, (error, data, response) => {
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
 **body** | [**AccesslistsListIDBody**](AccesslistsListIDBody.md)| Access List Payload | 
 **listID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2002**](InlineResponse2002.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

