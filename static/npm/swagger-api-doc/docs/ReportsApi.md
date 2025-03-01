# NginxProxyManagerApi.ReportsApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**reportsHosts**](ReportsApi.md#reportsHosts) | **GET** /reports/hosts | Report on Host Statistics

<a name="reportsHosts"></a>
# **reportsHosts**
> InlineResponse2005 reportsHosts()

Report on Host Statistics

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.ReportsApi();
apiInstance.reportsHosts((error, data, response) => {
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

[**InlineResponse2005**](InlineResponse2005.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

