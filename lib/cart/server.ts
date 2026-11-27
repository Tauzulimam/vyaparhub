import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { UserRole } from '@/generated/prisma/enums';
import { resolveCurrentUser } from '@/lib/auth/current-user';
import { requirePortalAccess } from '@/lib/auth/guards';
import {
  queryCustomerAddresses,
  queryCustomerCart,
  queryCustomerDefaultLocationLabel,
  queryCustomerOrderDetail,
  queryCustomerOrders,
  queryCustomerProfileSummary,
} from '@/lib/cart/persistence';
import {
  type CartAuthStatus,
  createEmptyCustomerCartDto,
  type CustomerAddressDto,
  type CustomerCartDto,
  type CustomerOrderDetailDto,
  type CustomerOrderSummaryDto,
  type CustomerProfileDto,
  DEFAULT_DELIVERY_LOCATION_LABEL,
  deriveDeliveryLocationLabel,
} from '@/lib/cart/types';

export interface AuthenticatedCustomerContext {
  userId: string;
  email: string;
  customerProfileId: string;
  fullName: string;
}

export type CustomerSessionResolution =
  | {
      status: 'authenticated_customer';
      customer: AuthenticatedCustomerContext;
    }
  | { status: 'unauthenticated' }
  | { status: 'forbidden_role'; role: UserRole }
  | { status: 'inactive_account' }
  | { status: 'missing_profile' };

/**
 * Resolves the authenticated CUSTOMER and their PostgreSQL CustomerProfile
 * without redirecting (safe for `/cart` and Server Actions).
 */
export async function resolveAuthenticatedCustomer(): Promise<CustomerSessionResolution> {
  await connection();
  const resolution = await resolveCurrentUser();

  if (resolution.status === 'unauthenticated' || resolution.status === 'error') {
    return { status: 'unauthenticated' };
  }

  if (resolution.status === 'suspended' || resolution.status === 'inactive') {
    return { status: 'inactive_account' };
  }

  if (resolution.status === 'missing_app_user') {
    return { status: 'missing_profile' };
  }

  if (resolution.user.role !== UserRole.CUSTOMER) {
    return { status: 'forbidden_role', role: resolution.user.role };
  }

  const { prisma } = await import('@/lib/prisma');
  const profile = await prisma.customerProfile.findUnique({
    where: { userId: resolution.user.id },
    select: {
      id: true,
      userId: true,
      fullName: true,
    },
  });

  if (!profile) {
    return { status: 'missing_profile' };
  }

  return {
    status: 'authenticated_customer',
    customer: {
      userId: resolution.user.id,
      email: resolution.user.email,
      customerProfileId: profile.id,
      fullName: profile.fullName,
    },
  };
}

/**
 * Shared protected customer loader used by BOTH `/checkout` and `/profile` so both
 * pages are guaranteed to resolve the exact same authenticated PostgreSQL customer.
 */
async function requireAuthenticatedCustomerSummary(
  fallbackLoginPath: string
): Promise<CustomerProfileDto> {
  await connection();
  const user = await requirePortalAccess([UserRole.CUSTOMER], fallbackLoginPath);

  const { prisma } = await import('@/lib/prisma');
  const summary = await queryCustomerProfileSummary(prisma, user.id);

  if (!summary) {
    redirect('/login?error=account_setup_required');
  }

  return summary;
}

/**
 * Non-redirecting delivery location resolver for public/mixed customer routes
 * (`/`, `/stores`, `/stores/[id]`, `/products`, `/products/[id]`, `/cart`).
 * Returns `${area}, ${city}` for an authenticated customer with a default Address,
 * or `'Local Delivery Zone'` otherwise.
 */
export async function resolveOptionalCustomerLocationLabel(): Promise<string> {
  const session = await resolveAuthenticatedCustomer();
  if (session.status !== 'authenticated_customer') {
    return DEFAULT_DELIVERY_LOCATION_LABEL;
  }

  const { prisma } = await import('@/lib/prisma');
  return queryCustomerDefaultLocationLabel(prisma, session.customer.customerProfileId);
}

export interface CartPageServerData {
  authStatus: CartAuthStatus;
  nonCustomerRole?: UserRole;
  cart: CustomerCartDto;
  deliveryLocationLabel: string;
}

/**
 * Server Component loader for `/cart`.
 * Safely handles unauthenticated visitors and non-CUSTOMER accounts without crashing.
 */
export async function getCartPageServerData(): Promise<CartPageServerData> {
  const session = await resolveAuthenticatedCustomer();

  if (session.status !== 'authenticated_customer') {
    return {
      authStatus: session.status,
      nonCustomerRole: session.status === 'forbidden_role' ? session.role : undefined,
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
}

export interface CheckoutPageServerData {
  customer: AuthenticatedCustomerContext;
  cart: CustomerCartDto;
  addresses: CustomerAddressDto[];
  deliveryLocationLabel: string;
}

/**
 * Protected Server Component loader for `/checkout`.
 * Enforces `UserRole.CUSTOMER` access via `requireAuthenticatedCustomerSummary`
 * and loads real PostgreSQL Cart + CustomerAddress records.
 */
export async function getCheckoutPageServerData(): Promise<CheckoutPageServerData> {
  const summary = await requireAuthenticatedCustomerSummary('/login?next=%2Fcheckout');

  const { prisma } = await import('@/lib/prisma');
  const [cart, addresses] = await Promise.all([
    queryCustomerCart(prisma, summary.customerProfileId),
    queryCustomerAddresses(prisma, summary.customerProfileId),
  ]);

  return {
    customer: {
      userId: summary.userId,
      email: summary.email,
      customerProfileId: summary.customerProfileId,
      fullName: summary.fullName,
    },
    cart,
    addresses,
    deliveryLocationLabel: deriveDeliveryLocationLabel(addresses),
  };
}

export interface CustomerProfilePageServerData {
  profile: CustomerProfileDto;
  addresses: CustomerAddressDto[];
  deliveryLocationLabel: string;
}

/**
 * Protected Server Component loader for `/profile`.
 * Resolves the exact same authenticated PostgreSQL User + CustomerProfile + Address
 * records used by `/checkout`.
 */
export async function getCustomerProfilePageServerData(): Promise<CustomerProfilePageServerData> {
  const profile = await requireAuthenticatedCustomerSummary('/login?next=%2Fprofile');

  const { prisma } = await import('@/lib/prisma');
  const addresses = await queryCustomerAddresses(prisma, profile.customerProfileId);

  return {
    profile,
    addresses,
    deliveryLocationLabel: deriveDeliveryLocationLabel(addresses),
  };
}

export interface CustomerOrdersPageServerData {
  orders: CustomerOrderSummaryDto[];
  deliveryLocationLabel: string;
}

/**
 * Protected Server Component loader for `/orders`.
 * Resolves real PostgreSQL Order records and default delivery location for the
 * authenticated customer.
 */
export async function getCustomerOrdersPageServerData(): Promise<CustomerOrdersPageServerData> {
  const summary = await requireAuthenticatedCustomerSummary('/login?next=%2Forders');

  const { prisma } = await import('@/lib/prisma');
  const [orders, deliveryLocationLabel] = await Promise.all([
    queryCustomerOrders(prisma, summary.customerProfileId),
    queryCustomerDefaultLocationLabel(prisma, summary.customerProfileId),
  ]);

  return {
    orders,
    deliveryLocationLabel,
  };
}

export interface CustomerOrderDetailPageServerData {
  order: CustomerOrderDetailDto | null;
  deliveryLocationLabel: string;
}

/**
 * Protected Server Component loader for `/orders/[id]`.
 * Resolves a real PostgreSQL Order ONLY if owned by the authenticated customer.
 */
export async function getCustomerOrderDetailPageServerData(
  orderIdOrNumber: string
): Promise<CustomerOrderDetailPageServerData> {
  const cleanTarget = encodeURIComponent(`/orders/${orderIdOrNumber || ''}`);
  const summary = await requireAuthenticatedCustomerSummary(`/login?next=${cleanTarget}`);

  const { prisma } = await import('@/lib/prisma');
  const [order, deliveryLocationLabel] = await Promise.all([
    queryCustomerOrderDetail(prisma, {
      customerProfileId: summary.customerProfileId,
      orderIdOrNumber,
    }),
    queryCustomerDefaultLocationLabel(prisma, summary.customerProfileId),
  ]);

  return {
    order,
    deliveryLocationLabel,
  };
}
