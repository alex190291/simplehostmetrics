import unittest
from unittest.mock import patch, MagicMock
from flask import Flask, jsonify
from functools import wraps

# Import your app and configuration.
# Adjust the import path as necessary.
from app import app, config_data, npm_proxy

# Bypass the login_required decorator for testing.
def dummy_login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function

# Replace the login_required decorator on the npm_proxy route.
app.view_functions['npm_proxy'] = dummy_login_required(app.view_functions['npm_proxy'])

class NpmProxyTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        # Ensure that the config for NPM is set.
        config_data['npm'] = {'domain': 'example.com'}

    @patch('app.requests.request')
    def test_npm_proxy_default_path(self, mock_request):
        # Create a fake response for the default (empty) path.
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.content = b'{"success": true}'
        fake_response.headers = {'Content-Type': 'application/json'}

        mock_request.return_value = fake_response

        # Test accessing /npm-api (default path).
        response = self.client.get('/npm-api', follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b'{"success": true}')

    @patch('app.requests.request')
    def test_npm_proxy_with_path(self, mock_request):
        # Create a fake response for a specific path.
        fake_response = MagicMock()
        fake_response.status_code = 200
        fake_response.content = b'{"data": "test"}'
        fake_response.headers = {'Content-Type': 'application/json'}

        mock_request.return_value = fake_response

        # Test accessing /npm-api/some/path.
        response = self.client.get('/npm-api/some/path', follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, b'{"data": "test"}')

    @patch('app.requests.request')
    def test_npm_proxy_error(self, mock_request):
        # Simulate a RequestException from the external call.
        from requests import RequestException
        mock_request.side_effect = RequestException("Test error")

        response = self.client.get('/npm-api/error/test', follow_redirects=True)
        self.assertEqual(response.status_code, 500)
        self.assertIn(b'"error": "Test error"', response.data)

if __name__ == '__main__':
    unittest.main()
