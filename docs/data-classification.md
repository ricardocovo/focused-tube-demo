# Data Classification Policy

## Public

Public data is approved for unrestricted disclosure. It may be logged, cached, stored,
or sent to third parties when doing so supports a documented product purpose.

## Internal

Internal data is intended for authenticated users, employees, or trusted operational
systems. Limit access to the intended audience and do not expose it through public API
responses, public logs, or unauthenticated storage.

## Confidential

Confidential data includes non-public account, business, authentication, and behavioral
information whose disclosure could harm a user or the service. Encrypt it in transit
and at rest, restrict access to the minimum required roles, and do not weaken existing
access controls, retention, or boundary protections.

## Restricted PII

Restricted PII includes direct identifiers, government identifiers, precise location,
financial account data, authentication secrets, and sensitive attributes tied or
linkable to a person. It must remain within explicitly authorized application and
storage boundaries, must never appear in logs, traces, metrics, analytics, error
messages, or exception payloads, and may be shared with a third party only when the
integration and purpose are explicitly approved.

## Data Inventory and Purpose

Every newly collected or exposed personal or sensitive field must have a stated product
purpose. New fields that comply with their tier's handling rules must still be
registered in the repository's data inventory.
