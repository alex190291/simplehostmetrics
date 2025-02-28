# NginxProxyManagerApi.CertificatesApi

All URIs are relative to *http://npm.ganjagaming.de/api*

Method | HTTP request | Description
------------- | ------------- | -------------
[**createCertificate**](CertificatesApi.md#createCertificate) | **POST** /nginx/certificates | Create a Certificate
[**deleteCertificate**](CertificatesApi.md#deleteCertificate) | **DELETE** /nginx/certificates/{certID} | Delete a Certificate
[**downloadCertificate**](CertificatesApi.md#downloadCertificate) | **GET** /nginx/certificates/{certID}/download | Downloads a Certificate
[**getCertificate**](CertificatesApi.md#getCertificate) | **GET** /nginx/certificates/{certID} | Get a Certificate
[**getCertificates**](CertificatesApi.md#getCertificates) | **GET** /nginx/certificates | Get all certificates
[**renewCertificate**](CertificatesApi.md#renewCertificate) | **POST** /nginx/certificates/{certID}/renew | Renews a Certificate
[**testHttpReach**](CertificatesApi.md#testHttpReach) | **GET** /nginx/certificates/test-http | Test HTTP Reachability
[**uploadCertificate**](CertificatesApi.md#uploadCertificate) | **POST** /nginx/certificates/{certID}/upload | Uploads a custom Certificate
[**validateCertificates**](CertificatesApi.md#validateCertificates) | **POST** /nginx/certificates/validate | Validates given Custom Certificates

<a name="createCertificate"></a>
# **createCertificate**
> InlineResponse201 createCertificate(body)

Create a Certificate

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let body = new NginxProxyManagerApi.NginxCertificatesBody(); // NginxCertificatesBody | Certificate Payload

apiInstance.createCertificate(body, (error, data, response) => {
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
 **body** | [**NginxCertificatesBody**](NginxCertificatesBody.md)| Certificate Payload | 

### Return type

[**InlineResponse201**](InlineResponse201.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

<a name="deleteCertificate"></a>
# **deleteCertificate**
> Object deleteCertificate(certID)

Delete a Certificate

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let certID = null; // Object | 

apiInstance.deleteCertificate(certID, (error, data, response) => {
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
 **certID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="downloadCertificate"></a>
# **downloadCertificate**
> Object downloadCertificate(certID)

Downloads a Certificate

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let certID = null; // Object | 

apiInstance.downloadCertificate(certID, (error, data, response) => {
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
 **certID** | [**Object**](.md)|  | 

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/zip

<a name="getCertificate"></a>
# **getCertificate**
> InlineResponse201 getCertificate(certID)

Get a Certificate

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let certID = null; // Object | 

apiInstance.getCertificate(certID, (error, data, response) => {
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
 **certID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse201**](InlineResponse201.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="getCertificates"></a>
# **getCertificates**
> Object getCertificates(opts)

Get all certificates

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let opts = { 
  'expand': null // Object | Expansions
};
apiInstance.getCertificates(opts, (error, data, response) => {
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

<a name="renewCertificate"></a>
# **renewCertificate**
> InlineResponse201 renewCertificate(certID)

Renews a Certificate

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let certID = null; // Object | 

apiInstance.renewCertificate(certID, (error, data, response) => {
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
 **certID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse201**](InlineResponse201.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="testHttpReach"></a>
# **testHttpReach**
> testHttpReach(domains)

Test HTTP Reachability

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let domains = null; // Object | Expansions

apiInstance.testHttpReach(domains, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
});
```

### Parameters

Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **domains** | [**Object**](.md)| Expansions | 

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

<a name="uploadCertificate"></a>
# **uploadCertificate**
> InlineResponse2004 uploadCertificate(certificate, certificateKey, intermediateCertificate, certID)

Uploads a custom Certificate

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let certificate = null; // Object | 
let certificateKey = null; // Object | 
let intermediateCertificate = null; // Object | 
let certID = null; // Object | 

apiInstance.uploadCertificate(certificate, certificateKey, intermediateCertificate, certID, (error, data, response) => {
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
 **certificate** | [**Object**](.md)|  | 
 **certificateKey** | [**Object**](.md)|  | 
 **intermediateCertificate** | [**Object**](.md)|  | 
 **certID** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2004**](InlineResponse2004.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json

<a name="validateCertificates"></a>
# **validateCertificates**
> InlineResponse2003 validateCertificates(certificate, certificateKey, intermediateCertificate)

Validates given Custom Certificates

### Example
```javascript
import {NginxProxyManagerApi} from 'nginx_proxy_manager_api';

let apiInstance = new NginxProxyManagerApi.CertificatesApi();
let certificate = null; // Object | 
let certificateKey = null; // Object | 
let intermediateCertificate = null; // Object | 

apiInstance.validateCertificates(certificate, certificateKey, intermediateCertificate, (error, data, response) => {
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
 **certificate** | [**Object**](.md)|  | 
 **certificateKey** | [**Object**](.md)|  | 
 **intermediateCertificate** | [**Object**](.md)|  | 

### Return type

[**InlineResponse2003**](InlineResponse2003.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: multipart/form-data
 - **Accept**: application/json

