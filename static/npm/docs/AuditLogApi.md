# NginxProxyManagerApi.AuditLogApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**getAuditLog**](AuditLogApi.md#getAuditLog) | **GET** /audit-log | Get Audit Log

<a name="getAuditLog"></a>
# **getAuditLog**
> InlineResponse2001 getAuditLog()

Get Audit Log

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.AuditLogApi();
apiInstance.getAuditLog((error, data, response) => {
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

[**InlineResponse2001**](InlineResponse2001.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

