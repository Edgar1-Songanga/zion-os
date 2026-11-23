"use client";

import { useEffect, useRef } from "react";
import { trackProductEvent, type ProductKey, type ProductModuleKey, type ProductPageKey } from "@/lib/analytics/product-analytics";

export default function ProductPageView({
  product,
  module,
  page,
}: {
  product: ProductKey;
  module: ProductModuleKey;
  page: ProductPageKey;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackProductEvent(product, module, "page_view", { page_key: page });
  }, [product, module, page]);
  return null;
}
