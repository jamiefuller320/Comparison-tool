import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Link onto the homepage compare tool.
 * That route ships the compare bundle. Prefetching it from a landing page
 * downloads the bundle before anyone opens compare. The map chunk stays
 * behind the Find chapter and is not part of this preload.
 */
export function CompareToolLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}
