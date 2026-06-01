# RelayFlow

## Overview

RelayFlow is a modern realtime communication platform built to learn and demonstrate production-grade system design, backend architecture, realtime communication, and scalable application development.

The project is intentionally designed to evolve from a simple MVP into a distributed platform while maintaining clean architecture and developer experience.

The primary goal is educational:

* Learn system design
* Learn distributed systems concepts
* Learn realtime communication
* Learn scalable backend architecture
* Learn monorepo development
* Learn event-driven design

---

# Vision

RelayFlow starts as a realtime messaging platform and gradually evolves into a communication ecosystem.

Current Focus:

* Authentication
* One-to-One Messaging
* Realtime Updates
* Presence Tracking
* Typing Indicators
* Read Receipts

Future Expansion:

* Group Chats
* File Sharing
* Notifications
* Voice Calls
* Video Calls
* Workspaces
* Channels
* Integrations
* Public APIs

---

# Tech Stack

## Frontend

* Next.js
* TypeScript
* TailwindCSS
* Socket.IO Client

## Backend

* NestJS
* TypeScript
* Socket.IO

## Database

* PostgreSQL

## Realtime Infrastructure

* Redis

## Background Processing

* BullMQ

## Monorepo

* Nx

## Infrastructure

* Docker
* Docker Compose

Future:

* Kubernetes

---

# Architecture Philosophy

RelayFlow follows these principles:

## 1. Simplicity First

Avoid unnecessary complexity.

Every abstraction must solve a real problem.

---

## 2. Domain Driven Structure

Code should be organized by business domain rather than technical layers.

Examples:

* Auth
* Users
* Conversations
* Messages
* Presence

---

## 3. Event Driven Thinking

Services communicate through events whenever possible.

Example:

Message Created
→ Realtime Delivery
→ Notifications
→ Analytics

---

## 4. Scalability Through Separation

The system starts simple but can evolve into multiple services without major rewrites.

---

# Repository Structure

apps/

* web
* gateway
* auth-service
* chat-service
* realtime-service
* worker-service

libs/

* shared-types
* shared-events
* shared-constants
* database
* redis
* socket
* logger
* config
* validation

docs/

* architecture
* decisions
* setup
* roadmap

docker/

* local infrastructure

---

# Service Responsibilities

## Gateway

Responsibilities:

* Public API entry point
* Authentication validation
* Request routing
* Rate limiting

Should NOT contain business logic.

---

## Auth Service

Responsibilities:

* Registration
* Login
* JWT Management
* Session Management

Owns:

* Users
* Sessions

---

## Chat Service

Responsibilities:

* Conversations
* Messages
* Read Receipts

Owns:

* Conversations
* Messages

---

## Realtime Service

Responsibilities:

* WebSocket Connections
* Presence
* Typing Indicators
* Message Delivery

Owns:

* Socket State
* Realtime Communication

---

## Worker Service

Responsibilities:

* Notifications
* Scheduled Jobs
* Async Processing

Owns:

* BullMQ Workers

---

# Database Ownership

PostgreSQL stores:

* Users
* Sessions
* Conversations
* Conversation Members
* Messages
* Read Receipts

Redis stores:

* Presence
* Typing Indicators
* Socket Mapping
* Pub/Sub Events
* Cache

---

# Development Workflow

Before implementing features:

1. Design
2. Architecture Review
3. Database Design
4. API Design
5. Event Design
6. Implementation
7. Testing

Avoid implementing features without first documenting their design.

---

# Branch Strategy

main

Production-ready code.

develop

Active development.

feature/*

Feature branches.

Examples:

feature/auth
feature/conversations
feature/realtime-presence

---

# Coding Standards

## General

* TypeScript Strict Mode
* ESLint
* Prettier
* Conventional Commits

---

## Naming

Files:

kebab-case

Examples:

message.service.ts
conversation.controller.ts

Classes:

PascalCase

Variables:

camelCase

Constants:

UPPER_SNAKE_CASE

---

# Current MVP Scope

Authentication

* Register
* Login
* Refresh Token

Messaging

* Direct Messages
* Message Persistence
* Realtime Delivery

Presence

* Online
* Offline

Typing

* Typing Indicators

Read Receipts

* Message Seen State

---

# Out Of Scope (For Now)

* Group Chats
* Attachments
* Voice Calls
* Video Calls
* Workspaces
* Channels

These features will be added after the MVP is stable.

---

# Documentation Structure

Every major feature must include:

Feature Overview

API Design

Database Changes

Events Produced

Events Consumed

Testing Strategy

No feature should be implemented without corresponding documentation.

---

# Success Criteria

A successful RelayFlow MVP should:

* Support realtime messaging
* Persist messages reliably
* Handle reconnects gracefully
* Track presence accurately
* Demonstrate scalable architecture patterns
* Be understandable by new contributors

---

# Long-Term Goal

RelayFlow should become a reference project demonstrating how modern realtime applications are built using:

* NestJS
* Next.js
* PostgreSQL
* Redis
* BullMQ
* Event Driven Architecture
* Monorepo Development

while remaining approachable for developers learning advanced backend engineering concepts.
