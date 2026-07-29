A multi-service e-commerce platform that integrates with an external, third-party payment processor:

- **Web Browser**: the end user's browser, used to browse the storefront and place orders over the public internet.
- **API Gateway**: a public-facing REST API that authenticates requests (via a public identity provider) and routes them to backend microservices. Runs in a DMZ.
- **Order Service**: an internal microservice that manages the order lifecycle (created, paid, shipped). Communicates with the API Gateway and the Order Database.
- **Order Database**: a PostgreSQL database holding order records. Internal-only, no direct internet access.
- **Payment Service**: an internal microservice that orchestrates payment authorization. It never stores raw card data itself - it tokenizes card details via the External Payment Processor and stores only the resulting payment token alongside the order.
- **External Payment Processor**: a third-party, external payment gateway (e.g. a PCI-DSS-compliant processor) reached over the public internet via an outbound HTTPS API call. It is not part of this organization's infrastructure and is modeled as an external entity.
- **Message Queue**: an internal async message broker used to decouple the Order Service from downstream fulfillment processing, so a slow or failing downstream consumer can't block order creation.
- **Fulfillment Worker**: an internal background worker that consumes order-paid events from the Message Queue and triggers warehouse fulfillment.

Trust boundaries:
- The Web Browser and API Gateway sit in a **Public-facing tier** (internet-reachable, DMZ).
- The Order Service, Order Database, Payment Service, Message Queue, and Fulfillment Worker all sit in a **Private internal network** with no direct internet access.
- The External Payment Processor is entirely outside this organization's infrastructure, in an **External third-party tier** - the outbound call from Payment Service to it is the only edge crossing that boundary in either direction.

This is a materially more complex system than a simple 3-tier app: it has 8 components, an external third-party dependency reached over the public internet, an async message queue decoupling two internal services, and a service (Payment Service) that deliberately avoids storing sensitive data by delegating to an external processor - a design detail worth capturing as an explicit assumption.
