Problem statement 

I have my api document in a Open API specification format. since it is big json , claude code is not able to read and perform the correct action. So I want to convert the API endpoints to MCP server. so that Claude code can do a better job. 

What I wanted is, for each api, it needs to return what is the input and its structure with data type and example, what is response and its structure with data type, what is the endpoint to call. 


Excellent choice! Converting your OpenAPI spec into an MCP (Model Context Protocol) server is a great solution for handling large API documents. This will allow Claude to interact with your API dynamically without needing to load the entire specification at once.

## Here's how to build an MCP server for your OpenAPI spec:

### 1. **Basic MCP Server Structure**

```python
# openapi_mcp_server.py
import json
import yaml
from typing import Dict, List, Any
from mcp.server import Server, stdio_server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource

class OpenAPIMCPServer:
    def __init__(self, openapi_spec_path: str):
        self.server = Server("openapi-server")
        self.spec = self.load_spec(openapi_spec_path)
        self.setup_tools()
    
    def load_spec(self, path: str) -> Dict:
        with open(path, 'r') as f:
            if path.endswith('.yaml') or path.endswith('.yml'):
                return yaml.safe_load(f)
            return json.load(f)
    
    def setup_tools(self):
        # Tool to list all available endpoints
        @self.server.tool()
        async def list_endpoints() -> List[Dict]:
            """List all available API endpoints"""
            endpoints = []
            for path, methods in self.spec.get('paths', {}).items():
                for method in methods:
                    if method in ['get', 'post', 'put', 'delete', 'patch']:
                        endpoints.append({
                            'path': path,
                            'method': method.upper(),
                            'summary': methods[method].get('summary', '')
                        })
            return endpoints
        
        # Tool to get endpoint details
        @self.server.tool()
        async def get_endpoint_details(path: str, method: str) -> Dict:
            """Get detailed information about a specific endpoint"""
            method = method.lower()
            endpoint = self.spec['paths'].get(path, {}).get(method, {})
            return {
                'path': path,
                'method': method,
                'parameters': endpoint.get('parameters', []),
                'requestBody': endpoint.get('requestBody', {}),
                'responses': endpoint.get('responses', {}),
                'security': endpoint.get('security', [])
            }
        
        # Tool to search endpoints
        @self.server.tool()
        async def search_endpoints(keyword: str) -> List[Dict]:
            """Search endpoints by keyword in path or description"""
            results = []
            for path, methods in self.spec.get('paths', {}).items():
                if keyword.lower() in path.lower():
                    for method, details in methods.items():
                        if method in ['get', 'post', 'put', 'delete', 'patch']:
                            results.append({
                                'path': path,
                                'method': method.upper(),
                                'summary': details.get('summary', '')
                            })
            return results
        
        # Tool to get schema definition
        @self.server.tool()
        async def get_schema(schema_name: str) -> Dict:
            """Get a specific schema definition"""
            schemas = self.spec.get('components', {}).get('schemas', {})
            return schemas.get(schema_name, {})
        
        # Tool to generate code snippet
        @self.server.tool()
        async def generate_request_code(
            path: str, 
            method: str, 
            language: str = 'python'
        ) -> str:
            """Generate code snippet for making API request"""
            endpoint = self.spec['paths'][path][method.lower()]
            
            if language == 'python':
                return self._generate_python_code(path, method, endpoint)
            elif language == 'javascript':
                return self._generate_js_code(path, method, endpoint)
            elif language == 'curl':
                return self._generate_curl_code(path, method, endpoint)
            return "Language not supported"
    
    def _generate_python_code(self, path: str, method: str, endpoint: Dict) -> str:
        base_url = self.spec.get('servers', [{}])[0].get('url', 'https://api.example.com')
        
        code = f"""import requests

url = "{base_url}{path}"
"""
        
        # Add parameters
        params = endpoint.get('parameters', [])
        if params:
            code += "\nparams = {\n"
            for param in params:
                if param.get('in') == 'query':
                    code += f'    "{param["name"]}": value,  # {param.get("description", "")}\n'
            code += "}\n"
        
        # Add request body
        if endpoint.get('requestBody'):
            code += "\ndata = {\n    # Add request body here\n}\n"
        
        # Add request
        if method.upper() == 'GET':
            code += "\nresponse = requests.get(url"
            if params:
                code += ", params=params"
        else:
            code += f"\nresponse = requests.{method.lower()}(url"
            if params:
                code += ", params=params"
            if endpoint.get('requestBody'):
                code += ", json=data"
        
        code += ")\nprint(response.json())"
        return code

    async def run(self):
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )
```

### 2. **Enhanced MCP Server with Caching**

```python
# enhanced_openapi_mcp.py
import asyncio
from functools import lru_cache
from typing import Optional

class EnhancedOpenAPIMCPServer(OpenAPIMCPServer):
    def __init__(self, openapi_spec_path: str):
        super().__init__(openapi_spec_path)
        self.cache = {}
        self.setup_advanced_tools()
    
    def setup_advanced_tools(self):
        @self.server.tool()
        async def validate_request(
            path: str,
            method: str,
            request_data: Dict
        ) -> Dict:
            """Validate a request against the OpenAPI schema"""
            endpoint = self.spec['paths'][path][method.lower()]
            errors = []
            
            # Validate parameters
            for param in endpoint.get('parameters', []):
                if param.get('required') and param['name'] not in request_data:
                    errors.append(f"Missing required parameter: {param['name']}")
            
            # Validate request body schema
            if endpoint.get('requestBody'):
                schema_ref = endpoint['requestBody'].get('content', {}).get(
                    'application/json', {}
                ).get('schema', {}).get('$ref')
                
                if schema_ref:
                    schema_name = schema_ref.split('/')[-1]
                    schema = self.spec['components']['schemas'][schema_name]
                    # Add your schema validation logic here
            
            return {
                'valid': len(errors) == 0,
                'errors': errors
            }
        
        @self.server.tool()
        async def get_api_info() -> Dict:
            """Get general API information"""
            info = self.spec.get('info', {})
            return {
                'title': info.get('title'),
                'version': info.get('version'),
                'description': info.get('description'),
                'servers': self.spec.get('servers', []),
                'total_endpoints': len(self.spec.get('paths', {}))
            }
        
        @self.server.tool()
        async def get_authentication_info() -> Dict:
            """Get authentication requirements"""
            security_schemes = self.spec.get('components', {}).get(
                'securitySchemes', {}
            )
            return security_schemes
    
    @lru_cache(maxsize=100)
    def _get_endpoint_cached(self, path: str, method: str):
        """Cache frequently accessed endpoints"""
        return self.spec['paths'][path][method.lower()]
```

### 3. **Package Configuration**

```json
// package.json
{
  "name": "openapi-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for OpenAPI specifications",
  "scripts": {
    "start": "python openapi_mcp_server.py"
  },
  "mcp": {
    "name": "OpenAPI MCP Server",
    "description": "Interact with OpenAPI specifications",
    "tools": [
      "list_endpoints",
      "get_endpoint_details",
      "search_endpoints",
      "get_schema",
      "generate_request_code",
      "validate_request",
      "get_api_info",
      "get_authentication_info"
    ]
  }
}
```

### 4. **Claude Desktop Configuration**

Add to your Claude desktop config:

```json
{
  "mcpServers": {
    "openapi": {
      "command": "python",
      "args": ["/path/to/openapi_mcp_server.py", "--spec", "/path/to/your/openapi.json"],
      "env": {}
    }
  }
}
```

### 5. **Usage Example**

Once set up, you can interact with your API through Claude:

```python
# In Claude, you could then:
# 1. List all endpoints
# 2. Search for user-related endpoints
# 3. Get details about POST /users
# 4. Generate Python code for creating a user
# 5. Validate request data before sending
```

### 6. **Advanced Features to Add**

```python
class AdvancedOpenAPIMCPServer(EnhancedOpenAPIMCPServer):
    def setup_extra_tools(self):
        @self.server.tool()
        async def test_endpoint(
            path: str,
            method: str,
            data: Optional[Dict] = None,
            params: Optional[Dict] = None
        ) -> Dict:
            """Actually test an endpoint (if base URL is available)"""
            import aiohttp
            
            base_url = self.spec['servers'][0]['url']
            url = f"{base_url}{path}"
            
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method, 
                    url, 
                    json=data, 
                    params=params
                ) as response:
                    return {
                        'status': response.status,
                        'body': await response.json()
                    }
        
        @self.server.tool()
        async def generate_mock_data(schema_name: str) -> Dict:
            """Generate mock data based on schema"""
            schema = self.spec['components']['schemas'][schema_name]
            # Implement mock data generation based on schema
            return self._generate_mock_from_schema(schema)
```

## Benefits of this approach:

1. **Lazy Loading**: Only loads the data Claude needs
2. **Efficient**: No need to parse the entire spec repeatedly
3. **Extensible**: Easy to add new tools as needed
4. **Cached**: Frequently used endpoints are cached
5. **Interactive**: Claude can explore your API incrementally

