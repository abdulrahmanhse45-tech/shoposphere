import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";
import { formatPrice } from "../utils/imageUrl";

const OrderSuccess = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.order))
      .catch(() => {});
  }, [id]);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
      <h1>Thank you! Your order is placed.</h1>
      {order ? (
        <>
          <p>
            Order number: <strong>{order.orderNumber}</strong>
          </p>
          <p>
            Total: <strong>{formatPrice(order.pricing.total)}</strong> ·{" "}
            {order.paymentMethod === "COD" ? "Pay on delivery" : "Paid online"}
          </p>
        </>
      ) : (
        <p>Loading your order...</p>
      )}
      <p>
        <Link to={`/orders/${id}`}>View order details</Link> · <Link to="/orders">My orders</Link> ·{" "}
        <Link to="/products">Keep shopping</Link>
      </p>
    </div>
  );
};

export default OrderSuccess;
