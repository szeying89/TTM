A customer-facing web application with three tiers:

- **Web Browser**: the end user's browser, used to access the storefront over the public internet.
- **API Gateway**: a public-facing REST API that authenticates requests and routes them to backend services. Runs in a DMZ.
- **Order Database**: a PostgreSQL database holding customer orders and payment metadata. It sits in a private subnet with no direct internet access, reachable only from the API Gateway over an internal network.

The Web Browser and API Gateway are both internet-reachable and are considered part of the public-facing tier. The Order Database is isolated in a separate, more trusted internal network segment because it stores sensitive payment metadata.
