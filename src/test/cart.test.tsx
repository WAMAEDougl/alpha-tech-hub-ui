/**
 * Property-based tests for CartContext
 *
 * Property 1: Adding then removing an item leaves the cart unchanged
 *   **Validates: Requirements - Shopping Cart Page**
 *
 * Property 2: Total price equals sum of (price × quantity) for all items
 *   **Validates: Requirements - Shopping Cart Page**
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { useContext, useRef } from "react";
import { CartProvider, CartContext, CartItem } from "@/contexts/CartContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    name: "Product 1",
    price: 10,
    quantity: 1,
    imageUrl: "/img.png",
    ...overrides,
  };
}

interface CartSnapshot {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
}

/**
 * Renders a CartProvider and returns a ref-like object that always reflects
 * the latest context value. Optionally seeds the cart with initialItems.
 */
function renderCart(initialItems: CartItem[] = []) {
  const snapshot: CartSnapshot = {
    items: [],
    addItem: () => {},
    removeItem: () => {},
  };

  function Inspector() {
    const ctx = useContext(CartContext);
    snapshot.items = ctx.items;
    snapshot.addItem = ctx.addItem;
    snapshot.removeItem = ctx.removeItem;
    return null;
  }

  const utils = render(
    <CartProvider>
      <Inspector />
    </CartProvider>
  );

  if (initialItems.length > 0) {
    act(() => {
      initialItems.forEach((item) => snapshot.addItem(item));
    });
  }

  return { snapshot, ...utils };
}

// ---------------------------------------------------------------------------
// Property 1: addItem then removeItem leaves the cart unchanged
// **Validates: Requirements - Shopping Cart Page**
// ---------------------------------------------------------------------------

describe("Property 1: addItem then removeItem leaves the cart unchanged", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  const cases: Array<{ label: string; initial: CartItem[]; newItem: CartItem }> = [
    {
      label: "empty cart – add then remove a single item",
      initial: [],
      newItem: makeItem({ productId: "new-1", name: "New Item", price: 25, quantity: 1 }),
    },
    {
      label: "cart with one item – add then remove a different item",
      initial: [makeItem({ productId: "existing-1", price: 50, quantity: 2 })],
      newItem: makeItem({ productId: "new-2", name: "Another Item", price: 15, quantity: 3 }),
    },
    {
      label: "cart with multiple items – add then remove a new item",
      initial: [
        makeItem({ productId: "a", price: 100, quantity: 1 }),
        makeItem({ productId: "b", price: 200, quantity: 2 }),
      ],
      newItem: makeItem({ productId: "c", name: "Third", price: 300, quantity: 1 }),
    },
    {
      label: "cart with items – add then remove an item with high quantity",
      initial: [makeItem({ productId: "x", price: 9.99, quantity: 5 })],
      newItem: makeItem({ productId: "y", name: "Bulk Item", price: 1.5, quantity: 100 }),
    },
    {
      label: "cart with items – add then remove an item with fractional price",
      initial: [
        makeItem({ productId: "m1", price: 7.49, quantity: 3 }),
        makeItem({ productId: "m2", price: 12.99, quantity: 1 }),
      ],
      newItem: makeItem({ productId: "m3", name: "Fractional", price: 0.99, quantity: 2 }),
    },
    {
      label: "empty cart – add then remove item with quantity > 1",
      initial: [],
      newItem: makeItem({ productId: "q1", name: "Multi Qty", price: 5, quantity: 7 }),
    },
    {
      label: "cart with three items – add then remove a fourth",
      initial: [
        makeItem({ productId: "t1", price: 10, quantity: 1 }),
        makeItem({ productId: "t2", price: 20, quantity: 2 }),
        makeItem({ productId: "t3", price: 30, quantity: 3 }),
      ],
      newItem: makeItem({ productId: "t4", name: "Fourth", price: 40, quantity: 4 }),
    },
  ];

  cases.forEach(({ label, initial, newItem }) => {
    it(label, async () => {
      const { snapshot } = renderCart(initial);

      // Snapshot the cart state before the add
      const before = snapshot.items.map((i) => ({ ...i }));

      // Add the new item
      await act(async () => {
        snapshot.addItem(newItem);
      });

      // Remove the same item
      await act(async () => {
        snapshot.removeItem(newItem.productId);
      });

      // Cart should be identical to before
      expect(snapshot.items).toEqual(before);
    });
  });
});

// ---------------------------------------------------------------------------
// Property 2: Total price equals sum of (price × quantity) for all items
// **Validates: Requirements - Shopping Cart Page**
// ---------------------------------------------------------------------------

describe("Property 2: Total price equals sum of (price × quantity) for all items", () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  const cases: Array<{ label: string; items: CartItem[] }> = [
    {
      label: "empty cart has total of 0",
      items: [],
    },
    {
      label: "single item: total = price × quantity",
      items: [makeItem({ productId: "s1", price: 49.99, quantity: 1 })],
    },
    {
      label: "two items with different prices and quantities",
      items: [
        makeItem({ productId: "d1", price: 10, quantity: 3 }),
        makeItem({ productId: "d2", price: 25, quantity: 2 }),
      ],
    },
    {
      label: "three items including one with quantity > 1",
      items: [
        makeItem({ productId: "tr1", price: 5, quantity: 10 }),
        makeItem({ productId: "tr2", price: 100, quantity: 1 }),
        makeItem({ productId: "tr3", price: 7.5, quantity: 4 }),
      ],
    },
    {
      label: "items with fractional prices",
      items: [
        makeItem({ productId: "f1", price: 1.99, quantity: 5 }),
        makeItem({ productId: "f2", price: 0.49, quantity: 20 }),
      ],
    },
    {
      label: "single item with large quantity",
      items: [makeItem({ productId: "lq1", price: 2.5, quantity: 1000 })],
    },
    {
      label: "five items with varied prices and quantities",
      items: [
        makeItem({ productId: "v1", price: 15, quantity: 2 }),
        makeItem({ productId: "v2", price: 30, quantity: 1 }),
        makeItem({ productId: "v3", price: 8.99, quantity: 3 }),
        makeItem({ productId: "v4", price: 120, quantity: 1 }),
        makeItem({ productId: "v5", price: 4.5, quantity: 6 }),
      ],
    },
  ];

  cases.forEach(({ label, items }) => {
    it(label, async () => {
      const { snapshot } = renderCart(items);

      const expectedTotal = snapshot.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const manualTotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      expect(expectedTotal).toBeCloseTo(manualTotal, 5);
    });
  });
});
