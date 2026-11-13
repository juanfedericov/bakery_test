import Link from "next/link";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <main className="checkout-page">
      <div className="checkout-inner">
        <Link href="/" className="checkout-back">← Volver a la tienda</Link>
        <p className="eyebrow">Un momento dulce</p>
        <h1>Datos para tu pedido</h1>
        <p className="checkout-intro">Contanos cómo y cuándo querés recibir tu pedido.</p>
        <CheckoutForm whatsappNumber={process.env.WHATSAPP_NUMBER ?? ""} />
      </div>
    </main>
  );
}
