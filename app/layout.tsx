import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Millino POS',
  description: 'Modern Point of Sale System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-emerald-600 text-white p-4 flex justify-between items-center">
          <a href="/"><h1 className="text-xl font-bold">Millino POS</h1></a>
          <div className="space-x-4">
            <a href="/products" className="hover:underline">Menu</a>
            <a href="/admin/products" className="hover:underline">Admin</a>
          </div>
        </nav>
        <main className="p-4">{children}</main>
      </body>
    </html>
  )
}