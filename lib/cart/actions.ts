'use server';

import { revalidatePath } from 'next/cache';
import {
  executeAddToCart,
  executeClearCustomerCart,
  executeCreateCustomerAddress,
  executeDeleteCustomerAddress,
  executeRemoveCartItem,
  executeReplaceCartWithItem,
  executeSetDefaultCustomerAddress,
  executeUpdateCartItemQuantity,
  executeUpdateCustomerAddress,
  executeUpdateCustomerProfileName,
  executeValidateCustomerCheckout,
  queryCustomerCart,
  queryCustomerDefaultLocationLabel,
} from '@/lib/cart/persistence';
import { resolveAuthenticatedCustomer } from '@/lib/cart/server';
import {
  type AddressActionResult,
  type AddressListActionResult,
  type CartActionResult,
  type CartAuthStatus,
  type CheckoutValidationResult,
  type CreateCustomerAddressInput,
  createEmptyCustomerCartDto,
  type CustomerCartDto,
  DEFAULT_DELIVERY_LOCATION_LABEL,
  type ProfileUpdateActionResult,
} from '@/lib/cart/types';

function mapSessionFailureToCartError(
  status: Exclude<CartAuthStatus, 'authenticated_customer'>
): CartActionResult {
  switch (status) {
    case 'unauthenticated':
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'Please sign in with a customer account to use the shopping cart.',
      };
    case 'forbidden_role':
      return {
        success: false,
        code: 'FORBIDDEN_ROLE',
        error: 'Only customer accounts can add items to a shopping cart.',
      };
    case 'inactive_account':
    case 'missing_profile':
    default:
      return {
        success: false,
        code: 'ACCOUNT_INACTIVE',
        error: 'Your customer account is not active or ready for shopping.',
      };
  }
}

function revalidateCustomerCartRoutes() {
  revalidatePath('/cart');
  revalidatePath('/checkout');
}

function revalidateCustomerAddressRoutes() {
  revalidatePath('/');
  revalidatePath('/stores');
  revalidatePath('/products');
  revalidatePath('/cart');
  revalidatePath('/checkout');
  revalidatePath('/profile');
  revalidatePath('/orders');
}

/**
 * Returns the current customer's authoritative cart summary and default delivery
 * location label for client badge/Navbar state sync.
 * Guests and non-CUSTOMER roles safely receive an empty cart and neutral location.
 */
export async function getCustomerCartSummaryAction(): Promise<{
  authStatus: CartAuthStatus;
  cart: CustomerCartDto;
  deliveryLocationLabel: string;
}> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return {
        authStatus: session.status,
        cart: createEmptyCustomerCartDto(),
        deliveryLocationLabel: DEFAULT_DELIVERY_LOCATION_LABEL,
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const [cart, deliveryLocationLabel] = await Promise.all([
      queryCustomerCart(prisma, session.customer.customerProfileId),
      queryCustomerDefaultLocationLabel(prisma, session.customer.customerProfileId),
    ]);

    return {
      authStatus: 'authenticated_customer',
      cart,
      deliveryLocationLabel,
    };
  } catch (error: unknown) {
    console.error('Failed to fetch customer cart summary:', error);
    return {
      authStatus: 'unauthenticated',
      cart: createEmptyCustomerCartDto(),
      deliveryLocationLabel: DEFAULT_DELIVERY_LOCATION_LABEL,
    };
  }
}

/**
 * Adds a StoreProduct (`storeProductId`, `quantity`) to the authenticated customer's
 * PostgreSQL Cart. Never accepts client-supplied customer ID, store ID, or price.
 */
export async function addToCartAction(
  storeProductId: string,
  quantity = 1
): Promise<CartActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return mapSessionFailureToCartError(session.status);
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeAddToCart(prisma, {
      customerProfileId: session.customer.customerProfileId,
      storeProductId,
      quantityToAdd: quantity,
    });

    if (result.success) {
      revalidateCustomerCartRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to add item to cart:', error);
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Could not add item to cart. Please try again.',
    };
  }
}

/**
 * Explicitly replaces an existing cart from another store with the selected StoreProduct
 * after customer confirmation in `SwitchCartModal`.
 */
export async function replaceCartWithItemAction(
  storeProductId: string,
  quantity = 1
): Promise<CartActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return mapSessionFailureToCartError(session.status);
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeReplaceCartWithItem(prisma, {
      customerProfileId: session.customer.customerProfileId,
      storeProductId,
      quantity,
    });

    if (result.success) {
      revalidateCustomerCartRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to switch store cart:', error);
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Could not switch cart to the new store. Please try again.',
    };
  }
}

/**
 * Updates exact quantity for an owned CartItem (`0` removes the item).
 */
export async function updateCartItemQuantityAction(
  cartItemId: string,
  nextQuantity: number
): Promise<CartActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return mapSessionFailureToCartError(session.status);
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeUpdateCartItemQuantity(prisma, {
      customerProfileId: session.customer.customerProfileId,
      cartItemId,
      nextQuantity,
    });

    revalidateCustomerCartRoutes();
    return result;
  } catch (error: unknown) {
    console.error('Failed to update cart item quantity:', error);
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Could not update item quantity. Please try again.',
    };
  }
}

/**
 * Removes an owned CartItem from the authenticated customer's Cart.
 */
export async function removeCartItemAction(cartItemId: string): Promise<CartActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return mapSessionFailureToCartError(session.status);
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeRemoveCartItem(prisma, {
      customerProfileId: session.customer.customerProfileId,
      cartItemId,
    });

    if (result.success) {
      revalidateCustomerCartRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to remove cart item:', error);
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Could not remove item from cart. Please try again.',
    };
  }
}

/**
 * Clears the entire Cart belonging to the authenticated customer.
 */
export async function clearCustomerCartAction(): Promise<CartActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return mapSessionFailureToCartError(session.status);
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeClearCustomerCart(
      prisma,
      session.customer.customerProfileId
    );

    if (result.success) {
      revalidateCustomerCartRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to clear customer cart:', error);
    return {
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Could not clear cart. Please try again.',
    };
  }
}

/**
 * Creates a new delivery Address owned strictly by the authenticated customer.
 */
export async function createCustomerAddressAction(
  input: CreateCustomerAddressInput
): Promise<AddressActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return {
        success: false,
        error: 'Please sign in with an active customer account to add an address.',
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeCreateCustomerAddress(
      prisma,
      session.customer.customerProfileId,
      input
    );

    if (result.success) {
      revalidateCustomerAddressRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to create customer address:', error);
    return {
      success: false,
      error: 'Could not save delivery address. Please try again.',
    };
  }
}

/**
 * Revalidates live cart, prices, stock, store eligibility, and owned address
 * for Phase 8 checkout readiness (without creating a fake Order).
 */
export async function validateCustomerCheckoutAction(input: {
  addressId: string;
  paymentMethod: string;
  expectedSubtotal?: number;
}): Promise<CheckoutValidationResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status === 'unauthenticated') {
      return {
        valid: false,
        code: 'UNAUTHENTICATED',
        error: 'Please sign in to complete checkout validation.',
      };
    }
    if (session.status !== 'authenticated_customer') {
      return {
        valid: false,
        code: 'FORBIDDEN_ROLE',
        error: 'Only active customer accounts can proceed through checkout.',
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeValidateCustomerCheckout(prisma, {
      customerProfileId: session.customer.customerProfileId,
      addressId: input.addressId,
      paymentMethod: input.paymentMethod,
      expectedSubtotal: input.expectedSubtotal,
    });

    revalidateCustomerCartRoutes();
    return result;
  } catch (error: unknown) {
    console.error('Failed to validate checkout readiness:', error);
    return {
      valid: false,
      code: 'STALE_OR_INVALID_CART',
      error: 'Could not validate checkout readiness right now. Please refresh and try again.',
    };
  }
}

/**
 * Updates the authenticated customer's `CustomerProfile.fullName` in PostgreSQL.
 */
export async function updateCustomerProfileNameAction(
  fullName: string
): Promise<ProfileUpdateActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return {
        success: false,
        error: 'Please sign in with an active customer account to update your profile.',
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeUpdateCustomerProfileName(
      prisma,
      session.customer.customerProfileId,
      fullName
    );

    if (result.success) {
      revalidateCustomerAddressRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to update customer profile name:', error);
    return {
      success: false,
      error: 'Could not update profile details. Please try again.',
    };
  }
}

/**
 * Updates an existing Address owned strictly by the authenticated customer.
 */
export async function updateCustomerAddressAction(
  addressId: string,
  input: CreateCustomerAddressInput
): Promise<AddressActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return {
        success: false,
        error: 'Please sign in with an active customer account to update an address.',
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeUpdateCustomerAddress(
      prisma,
      session.customer.customerProfileId,
      addressId,
      input
    );

    if (result.success) {
      revalidateCustomerAddressRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to update customer address:', error);
    return {
      success: false,
      error: 'Could not update delivery address. Please try again.',
    };
  }
}

/**
 * Marks an owned Address as the authenticated customer's default delivery address.
 */
export async function setDefaultCustomerAddressAction(
  addressId: string
): Promise<AddressListActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return {
        success: false,
        error: 'Please sign in with an active customer account to manage addresses.',
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeSetDefaultCustomerAddress(
      prisma,
      session.customer.customerProfileId,
      addressId
    );

    if (result.success) {
      revalidateCustomerAddressRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to set default customer address:', error);
    return {
      success: false,
      error: 'Could not update default address. Please try again.',
    };
  }
}

/**
 * Deletes an Address owned strictly by the authenticated customer.
 */
export async function deleteCustomerAddressAction(
  addressId: string
): Promise<AddressListActionResult> {
  try {
    const session = await resolveAuthenticatedCustomer();
    if (session.status !== 'authenticated_customer') {
      return {
        success: false,
        error: 'Please sign in with an active customer account to delete an address.',
      };
    }

    const { prisma } = await import('@/lib/prisma');
    const result = await executeDeleteCustomerAddress(
      prisma,
      session.customer.customerProfileId,
      addressId
    );

    if (result.success) {
      revalidateCustomerAddressRoutes();
    }

    return result;
  } catch (error: unknown) {
    console.error('Failed to delete customer address:', error);
    return {
      success: false,
      error: 'Could not delete delivery address. Please try again.',
    };
  }
}
