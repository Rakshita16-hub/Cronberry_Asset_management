import requests
import sys
import json
from datetime import datetime, date

class AssetManagementTester:
    def __init__(self, base_url="https://asset-manager-165.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "status": "PASS" if success else "FAIL",
            "details": details
        }
        self.test_results.append(result)
        
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                if response.text:
                    try:
                        error_data = response.json()
                        details += f" - {error_data.get('detail', response.text[:100])}"
                    except:
                        details += f" - {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return response.content
            return None

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return None

    def test_login(self):
        """Test login functionality"""
        print("\n🔐 Testing Authentication...")
        
        # Test valid login
        response_data = self.run_test(
            "Valid Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        
        if response_data and 'access_token' in response_data:
            self.token = response_data['access_token']
            self.log_test("Token Received", True, "JWT token obtained successfully")
        else:
            self.log_test("Token Received", False, "No token in response")
            return False

        # Test invalid login
        self.run_test(
            "Invalid Login",
            "POST", 
            "auth/login",
            401,
            data={"username": "admin", "password": "wrong"}
        )

        # Test get current user
        self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )

        return True

    def test_employees(self):
        """Test employee CRUD operations"""
        print("\n👥 Testing Employee Management...")
        
        # Get initial employees
        employees_data = self.run_test(
            "Get Employees",
            "GET",
            "employees",
            200
        )

        # Create employee
        employee_data = {
            "full_name": "Test Employee",
            "department": "IT",
            "designation": "Developer",
            "email": "test@example.com",
            "date_of_joining": "2024-01-15",
            "status": "Active"
        }
        
        created_employee = self.run_test(
            "Create Employee",
            "POST",
            "employees",
            200,
            data=employee_data
        )

        if created_employee:
            employee_id = created_employee.get('employee_id')
            
            # Update employee
            updated_data = employee_data.copy()
            updated_data['department'] = 'HR'
            
            self.run_test(
                "Update Employee",
                "PUT",
                f"employees/{employee_id}",
                200,
                data=updated_data
            )

            # Delete employee
            self.run_test(
                "Delete Employee",
                "DELETE",
                f"employees/{employee_id}",
                200
            )

            return employee_id
        
        return None

    def test_assets(self):
        """Test asset CRUD operations"""
        print("\n📦 Testing Asset Management...")
        
        # Get initial assets
        self.run_test(
            "Get Assets",
            "GET",
            "assets",
            200
        )

        # Create asset
        asset_data = {
            "asset_name": "Test Laptop",
            "category": "Electronics",
            "brand": "Dell",
            "serial_number": "DL123456",
            "condition": "New",
            "status": "Available"
        }
        
        created_asset = self.run_test(
            "Create Asset",
            "POST",
            "assets",
            200,
            data=asset_data
        )

        if created_asset:
            asset_id = created_asset.get('asset_id')
            
            # Update asset
            updated_data = asset_data.copy()
            updated_data['condition'] = 'Good'
            
            self.run_test(
                "Update Asset",
                "PUT",
                f"assets/{asset_id}",
                200,
                data=updated_data
            )

            return asset_id, created_asset
        
        return None, None

    def test_assignments_and_status_logic(self):
        """Test assignment CRUD and critical auto-status update logic"""
        print("\n🔄 Testing Assignment Management & Auto-Status Updates...")
        
        # First create test employee and asset
        employee_data = {
            "full_name": "Assignment Test Employee",
            "department": "IT",
            "designation": "Tester",
            "email": "assign_test@example.com",
            "date_of_joining": "2024-01-15",
            "status": "Active"
        }
        
        created_employee = self.run_test(
            "Create Test Employee for Assignment",
            "POST",
            "employees",
            200,
            data=employee_data
        )

        asset_data = {
            "asset_name": "Assignment Test Laptop",
            "category": "Electronics", 
            "brand": "HP",
            "serial_number": "HP789012",
            "condition": "New",
            "status": "Available"
        }
        
        created_asset = self.run_test(
            "Create Test Asset for Assignment",
            "POST",
            "assets",
            200,
            data=asset_data
        )

        if not created_employee or not created_asset:
            self.log_test("Assignment Prerequisites", False, "Failed to create test employee or asset")
            return

        employee_id = created_employee.get('employee_id')
        asset_id = created_asset.get('asset_id')

        # Verify asset is initially Available
        assets_data = self.run_test(
            "Get Assets Before Assignment",
            "GET",
            "assets",
            200
        )
        
        if assets_data:
            test_asset = next((a for a in assets_data if a['asset_id'] == asset_id), None)
            if test_asset and test_asset['status'] == 'Available':
                self.log_test("Asset Initial Status", True, "Asset status is Available")
            else:
                self.log_test("Asset Initial Status", False, f"Asset status is {test_asset['status'] if test_asset else 'not found'}")

        # Create assignment (should change asset status to Assigned)
        assignment_data = {
            "employee_id": employee_id,
            "asset_id": asset_id,
            "assigned_date": "2024-01-20",
            "remarks": "Test assignment"
        }
        
        created_assignment = self.run_test(
            "Create Assignment",
            "POST",
            "assignments",
            200,
            data=assignment_data
        )

        if created_assignment:
            assignment_id = created_assignment.get('assignment_id')
            
            # Verify asset status changed to Assigned
            assets_data = self.run_test(
                "Get Assets After Assignment",
                "GET",
                "assets",
                200
            )
            
            if assets_data:
                test_asset = next((a for a in assets_data if a['asset_id'] == asset_id), None)
                if test_asset and test_asset['status'] == 'Assigned':
                    self.log_test("Auto Status Update - Assignment", True, "Asset status changed to Assigned")
                else:
                    self.log_test("Auto Status Update - Assignment", False, f"Asset status is {test_asset['status'] if test_asset else 'not found'}")

            # Update assignment with return date (should change asset status to Available)
            updated_assignment = assignment_data.copy()
            updated_assignment['return_date'] = "2024-01-25"
            
            self.run_test(
                "Update Assignment with Return Date",
                "PUT",
                f"assignments/{assignment_id}",
                200,
                data=updated_assignment
            )

            # Verify asset status changed back to Available
            assets_data = self.run_test(
                "Get Assets After Return",
                "GET",
                "assets",
                200
            )
            
            if assets_data:
                test_asset = next((a for a in assets_data if a['asset_id'] == asset_id), None)
                if test_asset and test_asset['status'] == 'Available':
                    self.log_test("Auto Status Update - Return", True, "Asset status changed back to Available")
                else:
                    self.log_test("Auto Status Update - Return", False, f"Asset status is {test_asset['status'] if test_asset else 'not found'}")

            # Test delete assignment (should also change asset status to Available)
            self.run_test(
                "Delete Assignment",
                "DELETE",
                f"assignments/{assignment_id}",
                200
            )

            # Cleanup test data
            self.run_test(
                "Cleanup Test Employee",
                "DELETE",
                f"employees/{employee_id}",
                200
            )
            
            self.run_test(
                "Cleanup Test Asset",
                "DELETE",
                f"assets/{asset_id}",
                200
            )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard Stats...")
        
        stats_data = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )

        if stats_data:
            required_fields = ['total_assets', 'assigned_assets', 'available_assets', 'total_employees']
            all_fields_present = all(field in stats_data for field in required_fields)
            
            if all_fields_present:
                self.log_test("Dashboard Stats Fields", True, f"All required fields present: {stats_data}")
            else:
                missing = [f for f in required_fields if f not in stats_data]
                self.log_test("Dashboard Stats Fields", False, f"Missing fields: {missing}")

    def test_search_functionality(self):
        """Test employee search functionality"""
        print("\n🔍 Testing Search Functionality...")
        
        # Create a test employee for search
        employee_data = {
            "full_name": "Search Test Employee",
            "department": "Marketing",
            "designation": "Manager",
            "email": "search_test@example.com",
            "date_of_joining": "2024-01-15",
            "status": "Active"
        }
        
        created_employee = self.run_test(
            "Create Employee for Search Test",
            "POST",
            "employees",
            200,
            data=employee_data
        )

        if created_employee:
            employee_id = created_employee.get('employee_id')
            
            # Test search by name
            search_results = self.run_test(
                "Search by Name",
                "GET",
                f"search/employees?q=Search Test",
                200
            )
            
            if search_results and len(search_results) > 0:
                self.log_test("Search Results Found", True, f"Found {len(search_results)} results")
            else:
                self.log_test("Search Results Found", False, "No search results returned")

            # Test search by department
            self.run_test(
                "Search by Department",
                "GET",
                f"search/employees?q=Marketing",
                200
            )

            # Cleanup
            self.run_test(
                "Cleanup Search Test Employee",
                "DELETE",
                f"employees/{employee_id}",
                200
            )

    def test_export_functionality(self):
        """Test Excel export functionality"""
        print("\n📄 Testing Export Functionality...")
        
        response = requests.get(
            f"{self.api_url}/assignments/export",
            headers={'Authorization': f'Bearer {self.token}'}
        )
        
        success = response.status_code == 200
        content_type = response.headers.get('content-type', '')
        
        if success and 'spreadsheet' in content_type:
            self.log_test("Excel Export", True, f"Export successful, content-type: {content_type}")
        else:
            self.log_test("Excel Export", False, f"Status: {response.status_code}, content-type: {content_type}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Asset Management System Backend Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test authentication first
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False

        # Run all other tests
        self.test_employees()
        self.test_assets()
        self.test_assignments_and_status_logic()
        self.test_dashboard_stats()
        self.test_search_functionality()
        self.test_export_functionality()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = AssetManagementTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%"
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())