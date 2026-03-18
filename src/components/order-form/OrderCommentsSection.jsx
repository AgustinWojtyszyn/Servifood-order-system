const OrderCommentsSection = ({ comments, onCommentsChange }) => (
  <div className="card">
    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Información Adicional</h2>

    <div>
      <label htmlFor="additional-comments" className="block text-sm font-bold text-gray-700 mb-2">
        Comentarios adicionales
      </label>
      <textarea
        id="additional-comments"
        name="comments"
        value={comments}
        onChange={onCommentsChange}
        rows={4}
        className="input-field"
        placeholder="Instrucciones especiales, alergias, etc."
      />
    </div>

    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <p className="text-sm text-blue-800">
        <strong>📅 Fecha de entrega:</strong> Todos los pedidos se entregan al día siguiente
      </p>
    </div>
  </div>
)

export default OrderCommentsSection
