import Link from "next/link";
import CheckoutForm from "@/components/CheckoutForm";

export default function CheckoutPage() {
  return (
    <main className="checkout-page">
      <div className="checkout-inner">
        <Link href="/#carrito" className="checkout-back">← Volver al carrito</Link>
        <p className="eyebrow">Un momento dulce</p>
        <h1>Datos para tu pedido</h1>
        <p className="checkout-intro">Contanos cómo y cuándo querés recibir tu pedido.</p>
        <CheckoutForm />
      </div>
    </main>
  );
}
