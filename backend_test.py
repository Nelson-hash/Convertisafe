#!/usr/bin/env python3
"""
Backend Testing Suite for Document Converter Application
Tests all backend API endpoints and functionality
"""

import requests
import json
import time
from datetime import datetime
import uuid

# Load the backend URL from frontend .env
BACKEND_URL = "https://96834ef1-aa31-4b27-a10a-812a36179caf.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = {}
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        self.test_results[test_name] = {
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def test_health_check_endpoint(self):
        """Test GET /api/ health check endpoint"""
        print("\n=== Testing Health Check Endpoint ===")
        
        try:
            # Test without Origin header first
            response = self.session.get(f"{self.base_url}/")
            
            # Check response status
            if response.status_code != 200:
                self.log_test("Health Check Status", False, 
                            f"Expected 200, got {response.status_code}")
                return False
            
            # Check response content
            try:
                data = response.json()
                if data.get("message") == "Hello World":
                    self.log_test("Health Check Response", True, 
                                "Correct response message received")
                else:
                    self.log_test("Health Check Response", False, 
                                f"Unexpected response: {data}")
                    return False
            except json.JSONDecodeError:
                self.log_test("Health Check Response", False, 
                            "Invalid JSON response")
                return False
            
            # Test with Origin header for CORS
            response_with_origin = self.session.get(
                f"{self.base_url}/",
                headers={"Origin": "https://example.com"}
            )
            
            # Check CORS headers
            cors_origin = response_with_origin.headers.get('access-control-allow-origin')
            cors_credentials = response_with_origin.headers.get('access-control-allow-credentials')
            
            if cors_origin:
                self.log_test("Health Check CORS", True, 
                            f"CORS headers present - Origin: {cors_origin}, Credentials: {cors_credentials}")
            else:
                self.log_test("Health Check CORS", False, 
                            "No CORS headers found")
                return False
            
            return True
            
        except requests.exceptions.RequestException as e:
            self.log_test("Health Check Connection", False, 
                        f"Connection error: {str(e)}")
            return False
    
    def test_status_endpoints(self):
        """Test GET/POST /api/status endpoints"""
        print("\n=== Testing Status Endpoints ===")
        
        # Test POST /api/status (Create)
        try:
            test_data = {
                "client_name": f"test_client_{int(time.time())}"
            }
            
            response = self.session.post(
                f"{self.base_url}/status",
                json=test_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                self.log_test("Status POST", False, 
                            f"Expected 200, got {response.status_code}")
                return False
            
            try:
                created_status = response.json()
                
                # Validate response structure
                required_fields = ['id', 'client_name', 'timestamp']
                for field in required_fields:
                    if field not in created_status:
                        self.log_test("Status POST Structure", False, 
                                    f"Missing field: {field}")
                        return False
                
                # Validate data types
                if not isinstance(created_status['id'], str):
                    self.log_test("Status POST ID Type", False, 
                                "ID should be string")
                    return False
                
                if created_status['client_name'] != test_data['client_name']:
                    self.log_test("Status POST Data", False, 
                                "Client name mismatch")
                    return False
                
                self.log_test("Status POST", True, 
                            "Status created successfully", created_status)
                
                # Store created ID for cleanup
                created_id = created_status['id']
                
            except json.JSONDecodeError:
                self.log_test("Status POST Response", False, 
                            "Invalid JSON response")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Status POST Connection", False, 
                        f"Connection error: {str(e)}")
            return False
        
        # Test GET /api/status (Read)
        try:
            response = self.session.get(f"{self.base_url}/status")
            
            if response.status_code != 200:
                self.log_test("Status GET", False, 
                            f"Expected 200, got {response.status_code}")
                return False
            
            try:
                status_list = response.json()
                
                if not isinstance(status_list, list):
                    self.log_test("Status GET Structure", False, 
                                "Response should be a list")
                    return False
                
                # Check if our created status is in the list
                found_created = False
                for status in status_list:
                    if status.get('id') == created_id:
                        found_created = True
                        break
                
                if found_created:
                    self.log_test("Status GET", True, 
                                f"Retrieved {len(status_list)} status records")
                else:
                    self.log_test("Status GET Persistence", False, 
                                "Created status not found in list")
                    return False
                
            except json.JSONDecodeError:
                self.log_test("Status GET Response", False, 
                            "Invalid JSON response")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Status GET Connection", False, 
                        f"Connection error: {str(e)}")
            return False
        
        return True
    
    def test_mongodb_connectivity(self):
        """Test MongoDB connectivity through API operations"""
        print("\n=== Testing MongoDB Connectivity ===")
        
        # Create multiple records to test database operations
        test_clients = [
            f"mongo_test_1_{int(time.time())}",
            f"mongo_test_2_{int(time.time())}",
            f"mongo_test_3_{int(time.time())}"
        ]
        
        created_ids = []
        
        try:
            # Create multiple records
            for client_name in test_clients:
                response = self.session.post(
                    f"{self.base_url}/status",
                    json={"client_name": client_name},
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    created_ids.append(data['id'])
                else:
                    self.log_test("MongoDB Write Test", False, 
                                f"Failed to create record for {client_name}")
                    return False
            
            self.log_test("MongoDB Write Operations", True, 
                        f"Successfully created {len(created_ids)} records")
            
            # Test read operations
            response = self.session.get(f"{self.base_url}/status")
            if response.status_code == 200:
                status_list = response.json()
                
                # Verify all created records exist
                found_count = 0
                for status in status_list:
                    if status['id'] in created_ids:
                        found_count += 1
                
                if found_count == len(created_ids):
                    self.log_test("MongoDB Read Operations", True, 
                                f"All {found_count} created records retrieved")
                else:
                    self.log_test("MongoDB Read Operations", False, 
                                f"Only found {found_count}/{len(created_ids)} records")
                    return False
            else:
                self.log_test("MongoDB Read Test", False, 
                            "Failed to retrieve records")
                return False
            
            return True
            
        except requests.exceptions.RequestException as e:
            self.log_test("MongoDB Connectivity", False, 
                        f"Database operation failed: {str(e)}")
            return False
    
    def test_cors_configuration(self):
        """Test CORS configuration"""
        print("\n=== Testing CORS Configuration ===")
        
        try:
            # Test preflight request
            response = self.session.options(
                f"{self.base_url}/status",
                headers={
                    "Origin": "https://example.com",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type"
                }
            )
            
            # Check CORS headers in response
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
                'access-control-allow-credentials': response.headers.get('access-control-allow-credentials')
            }
            
            # Validate CORS headers
            if cors_headers['access-control-allow-origin']:
                self.log_test("CORS Allow Origin", True, 
                            f"Origin header: {cors_headers['access-control-allow-origin']}")
            else:
                self.log_test("CORS Allow Origin", False, 
                            "Missing Access-Control-Allow-Origin header")
                return False
            
            # Test actual request with CORS
            response = self.session.get(
                f"{self.base_url}/",
                headers={"Origin": "https://example.com"}
            )
            
            if response.status_code == 200:
                origin_header = response.headers.get('access-control-allow-origin')
                if origin_header:
                    self.log_test("CORS Actual Request", True, 
                                f"CORS working for actual requests: {origin_header}")
                    return True
                else:
                    self.log_test("CORS Actual Request", False, 
                                "No CORS headers in actual response")
                    return False
            else:
                self.log_test("CORS Actual Request", False, 
                            f"Request failed with status {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("CORS Configuration", False, 
                        f"CORS test failed: {str(e)}")
            return False
    
    def test_api_error_handling(self):
        """Test API error handling"""
        print("\n=== Testing API Error Handling ===")
        
        # Test invalid endpoint
        try:
            response = self.session.get(f"{self.base_url}/nonexistent")
            
            if response.status_code == 404:
                self.log_test("404 Error Handling", True, 
                            "Correctly returns 404 for invalid endpoints")
            else:
                self.log_test("404 Error Handling", False, 
                            f"Expected 404, got {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("404 Error Test", False, 
                        f"Connection error: {str(e)}")
            return False
        
        # Test invalid JSON data
        try:
            response = self.session.post(
                f"{self.base_url}/status",
                json={},  # Missing required client_name
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 422:  # FastAPI validation error
                self.log_test("Validation Error Handling", True, 
                            "Correctly returns 422 for invalid data")
            else:
                self.log_test("Validation Error Handling", False, 
                            f"Expected 422, got {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Validation Error Test", False, 
                        f"Connection error: {str(e)}")
            return False
        
        # Test malformed JSON
        try:
            response = self.session.post(
                f"{self.base_url}/status",
                data="invalid json",
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code in [400, 422]:
                self.log_test("Malformed JSON Handling", True, 
                            f"Correctly handles malformed JSON with status {response.status_code}")
            else:
                self.log_test("Malformed JSON Handling", False, 
                            f"Unexpected status for malformed JSON: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test("Malformed JSON Test", False, 
                        f"Connection error: {str(e)}")
            return False
        
        return True
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend Testing Suite for Document Converter")
        print(f"Testing backend at: {self.base_url}")
        print("=" * 60)
        
        test_functions = [
            self.test_health_check_endpoint,
            self.test_status_endpoints,
            self.test_mongodb_connectivity,
            self.test_cors_configuration,
            self.test_api_error_handling
        ]
        
        passed_tests = 0
        total_tests = len(test_functions)
        
        for test_func in test_functions:
            try:
                if test_func():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ CRITICAL ERROR in {test_func.__name__}: {str(e)}")
        
        print("\n" + "=" * 60)
        print(f"🏁 Backend Testing Complete: {passed_tests}/{total_tests} test suites passed")
        
        if passed_tests == total_tests:
            print("✅ All backend tests PASSED!")
            return True
        else:
            print("❌ Some backend tests FAILED!")
            return False
    
    def get_summary(self):
        """Get test summary"""
        return self.test_results

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    print("\n" + "=" * 60)
    print("📊 DETAILED TEST RESULTS:")
    for test_name, result in tester.get_summary().items():
        status = "✅" if result['success'] else "❌"
        print(f"{status} {test_name}: {result['message']}")
    
    exit(0 if success else 1)