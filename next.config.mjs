/** @type {import('next').NextConfig} */
import path from "path"

const nextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: path.join(process.cwd()),
}

export default nextConfig