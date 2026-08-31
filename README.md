# E-Commerce Backend

Backend API for an e-commerce application built with Node.js, Express.js, and MongoDB.

The project provides the main features needed for an e-commerce system, including authentication, authorization, product management, shopping cart, coupons, orders, payments, invoices, and email notifications.

## Features

* User authentication using JWT
* User registration, login, email verification, and password reset
* Authorization and protected routes based on user roles
* Product management
* Categories and subcategories management
* Shopping cart management
* Coupon and discount system
* Order creation and cancellation
* Cash payment
* Stripe online payment
* Stripe webhook for confirming successful payments
* Product stock management
* PDF invoice generation
* Invoice upload using Cloudinary
* Sending invoices to users through email
* Request validation
* Centralized error handling

## Technologies

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* Joi
* Stripe
* Cloudinary
* Multer
* Nodemailer

## Authentication & Authorization

The API uses JWT for authentication.

After logging in, the user receives a token that is used to access protected endpoints.

Authorization is used to control access to specific operations depending on the user's role. Protected routes verify the authenticated user before allowing access to resources or performing certain actions.

## Products, Categories & Subcategories

The application supports managing products using categories and subcategories.

Products can be associated with a specific category and subcategory, making it easier to organize products and retrieve them based on their classification.

## Cart & Orders

Users can add products to their cart, update quantities, and remove products.

When creating an order, the backend checks the products and their available stock before creating the order. The product price is also calculated on the backend to avoid relying on prices sent from the client.

After a successful order, the stock is updated and the user's cart is cleared.

## Coupons

The application supports coupons with expiration dates and percentage-based discounts.

Coupons are validated before being applied to an order. For Stripe payments, the discount is also applied to the Stripe Checkout session.

## Payment

The application supports both cash and online payments.

For cash orders, the order is completed directly after validation.

For Stripe payments, the order is initially created with a pending payment status. The user is redirected to Stripe Checkout to complete the payment.

After a successful payment, Stripe sends a webhook to the backend. The webhook verifies the Stripe signature and confirms the payment before completing the order.

## Invoice

After a successful order, the application generates a PDF invoice containing the order and shipping information.

The invoice is uploaded to Cloudinary and its URL is stored with the order. The invoice is then sent to the user's email.

## API

The API includes endpoints for:

* Authentication
* Authorization
* Users
* Products
* Categories
* Subcategories
* Cart
* Coupons
* Orders
* Payments
* Stripe Webhook
* Invoices

## Author

Abdelrahman Khaled Hamed

Backend / Full Stack Developer
