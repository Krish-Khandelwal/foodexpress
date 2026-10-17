import React, { createContext, useContext, useState } from 'react';

// 1. Create the context (Added 'export' here to fix the Navbar error)
export const CartContext = createContext();

// 2. Create the custom hook and export it as a named export
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// 3. Create the Provider component
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  // Add item to cart or update quantity if it already exists
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((i) => i.menuItem === item.menuItem);
      
      if (existingItemIndex > -1) {
        // Item exists, update its quantity
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += item.quantity || 1;
        return newCart;
      }
      
      // New item, add to cart
      return [...prevCart, { ...item, quantity: item.quantity || 1 }];
    });
  };

  // Remove item from cart
  const removeFromCart = (menuItemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.menuItem !== menuItemId));
  };

  // Clear cart after successful checkout
  const clearCart = () => {
    setCart([]);
  };

  // Calculate total price
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};