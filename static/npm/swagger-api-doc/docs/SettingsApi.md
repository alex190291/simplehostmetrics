# NginxProxyManagerApi.SettingsApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getSetting**](SettingsApi.md#getSetting) | **GET** /settings/{settingID} | Get a setting
[**getSettings**](SettingsApi.md#getSettings) | **GET** /settings | Get all settings
[**updateSetting**](SettingsApi.md#updateSetting) | **PUT** /settings/{settingID} | Update a setting

<a name="getSetting"></a>
# **getSetting**
> InlineResponse2006 getSetting(settingID)

Get a setting

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.SettingsApi();
let settingID = null; // Object | Setting ID

apiInstance.getSetting(settingID, (error, data, response) => {
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
 **settingID** | [**Object**](.md)| Setting ID | 

### Return type

[**InlineResponse2006**](InlineResponse2006.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getSettings"></a>
# **getSettings**
> Object getSettings()

Get all settings

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.SettingsApi();
apiInstance.getSettings((error, data, response) => {
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

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="updateSetting"></a>
# **updateSetting**
> InlineResponse2006 updateSetting(body, settingID)

Update a setting

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.SettingsApi();
let body = new NginxProxyManagerApi.SettingsSettingIDBody(); // SettingsSettingIDBody | Setting Payload
let settingID = null; // Object | Setting ID

apiInstance.updateSetting(body, settingID, (error, data, response) => {
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
 **body** | [**SettingsSettingIDBody**](SettingsSettingIDBody.md)| Setting Payload | 
 **settingID** | [**Object**](.md)| Setting ID | 

### Return type

[**InlineResponse2006**](InlineResponse2006.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

