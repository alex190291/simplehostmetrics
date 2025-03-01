# NginxProxyManagerApi.UsersApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createUser**](UsersApi.md#createUser) | **POST** /users | Create a User
[**deleteUser**](UsersApi.md#deleteUser) | **DELETE** /users/{userID} | Delete a User
[**getUser**](UsersApi.md#getUser) | **GET** /users/{userID} | Get a user
[**getUsers**](UsersApi.md#getUsers) | **GET** /users | Get all users
[**loginAsUser**](UsersApi.md#loginAsUser) | **POST** /users/{userID}/login | Login as this user
[**updateUser**](UsersApi.md#updateUser) | **PUT** /users/{userID} | Update a User
[**updateUserAuth**](UsersApi.md#updateUserAuth) | **PUT** /users/{userID}/auth | Update a User&#x27;s Authentication
[**updateUserPermissions**](UsersApi.md#updateUserPermissions) | **PUT** /users/{userID}/permissions | Update a User&#x27;s Permissions

<a name="createUser"></a>
# **createUser**
> InlineResponse2015 createUser(body)

Create a User

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let body = new NginxProxyManagerApi.UsersBody(); // UsersBody | User Payload

apiInstance.createUser(body, (error, data, response) => {
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
 **body** | [**UsersBody**](UsersBody.md)| User Payload | 

### Return type

[**InlineResponse2015**](InlineResponse2015.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deleteUser"></a>
# **deleteUser**
> Object deleteUser(userID)

Delete a User

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let userID = null; // Object | User ID

apiInstance.deleteUser(userID, (error, data, response) => {
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
 **userID** | [**Object**](.md)| User ID | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getUser"></a>
# **getUser**
> InlineResponse2015 getUser(userID)

Get a user

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let userID = null; // Object | User ID or 'me' for yourself

apiInstance.getUser(userID, (error, data, response) => {
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
 **userID** | [**Object**](.md)| User ID or &#x27;me&#x27; for yourself | 

### Return type

[**InlineResponse2015**](InlineResponse2015.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getUsers"></a>
# **getUsers**
> Object getUsers(opts)

Get all users

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let opts = { 
  'expand': null // Object | Expansions
};
apiInstance.getUsers(opts, (error, data, response) => {
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

<a name="loginAsUser"></a>
# **loginAsUser**
> InlineResponse2008 loginAsUser(userID)

Login as this user

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let userID = null; // Object | User ID

apiInstance.loginAsUser(userID, (error, data, response) => {
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
 **userID** | [**Object**](.md)| User ID | 

### Return type

[**InlineResponse2008**](InlineResponse2008.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="updateUser"></a>
# **updateUser**
> InlineResponse2015 updateUser(body, userID)

Update a User

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let body = new NginxProxyManagerApi.UsersUserIDBody(); // UsersUserIDBody | User Payload
let userID = null; // Object | User ID or 'me' for yourself

apiInstance.updateUser(body, userID, (error, data, response) => {
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
 **body** | [**UsersUserIDBody**](UsersUserIDBody.md)| User Payload | 
 **userID** | [**Object**](.md)| User ID or &#x27;me&#x27; for yourself | 

### Return type

[**InlineResponse2015**](InlineResponse2015.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="updateUserAuth"></a>
# **updateUserAuth**
> Object updateUserAuth(body, userID)

Update a User&#x27;s Authentication

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let body = new NginxProxyManagerApi.UserIDAuthBody(); // UserIDAuthBody | Auth Payload
let userID = null; // Object | User ID or 'me' for yourself

apiInstance.updateUserAuth(body, userID, (error, data, response) => {
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
 **body** | [**UserIDAuthBody**](UserIDAuthBody.md)| Auth Payload | 
 **userID** | [**Object**](.md)| User ID or &#x27;me&#x27; for yourself | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="updateUserPermissions"></a>
# **updateUserPermissions**
> Object updateUserPermissions(body, userID)

Update a User&#x27;s Permissions

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.UsersApi();
let body = new NginxProxyManagerApi.UserIDPermissionsBody(); // UserIDPermissionsBody | Permissions Payload
let userID = null; // Object | User ID

apiInstance.updateUserPermissions(body, userID, (error, data, response) => {
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
 **body** | [**UserIDPermissionsBody**](UserIDPermissionsBody.md)| Permissions Payload | 
 **userID** | [**Object**](.md)| User ID | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

