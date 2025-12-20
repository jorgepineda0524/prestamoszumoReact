import React from 'react';
import { DollarSign, Calendar, Users, X, RefreshCw, Receipt, CheckCircle } from 'lucide-react';

const PaymentForm = ({ 
  loans, 
  paymentFormData, 
  onInputChange, 
  onSavePayment, 
  loading, 
  formatCurrency, // Usamos la función del padre
  isModal = false, 
  onCancel 
}) => {

  // Función para formatear mientras escribe (agrega puntos)
  const formatDisplay = (value) => {
    if (!value) return '';
    const numericValue = value.toString().replace(/[^0-9]/g, '');
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'monto_pago') {
      // Limpiamos el valor para guardar solo números en el estado
      const rawValue = value.replace(/[^0-9]/g, '');
      onInputChange(name, rawValue);
    } else {
      onInputChange(name, value);
    }
  };

  return (
    <div className={`bg-white w-full max-w-xl mx-auto rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100 relative ${isModal ? 'animate-in fade-in zoom-in duration-300' : ''}`}>
      
      {/* Header ... (se mantiene igual) */}
      <div className="p-8 pb-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-2xl shadow-sm">
              <Receipt size={28} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight uppercase italic">Registrar Cuota</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Ingreso de capital a caja</p>
            </div>
          </div>
          {isModal && (
            <button onClick={onCancel} className="bg-slate-100 p-2.5 rounded-xl text-slate-400 hover:text-red-500 transition-all">
              <X size={20} />
            </button>
          )}
        </div>
        <div className="text-center mt-2">
          <div className="h-1.5 w-12 mx-auto rounded-full bg-emerald-500"></div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Selección de Préstamo ... (se mantiene igual) */}
        <div className="group">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Préstamo del Cliente</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500" size={18} />
            <select
              name="loan_id"
              value={paymentFormData.loan_id || ""}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-bold appearance-none"
            >
              <option value="">-- Seleccione un cliente activo --</option>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loan.clientes?.nombre} (Saldo: {formatCurrency(loan.saldo_pendiente)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* MONTO FORMATEADO */}
          <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Monto a Recibir</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg">$</div>
              <input
                type="text" // Cambiado a text para permitir el formato con puntos
                name="monto_pago"
                placeholder="$ 0"
                value={formatDisplay(paymentFormData.monto_pago)} // Mostramos con puntos
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-10 pr-4 text-slate-700 text-xl font-black outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>
            <p className="text-[9px] text-slate-400 italic mt-2 ml-2">
              * Se separará por miles automáticamente.
            </p>
          </div>

          {/* Fecha del Pago ... (se mantiene igual) */}
          <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Fecha Efectiva</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={18} />
              <input
                required
                type="date"
                name="fecha_pago"
                value={paymentFormData.fecha_pago}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold"
              />
            </div>
          </div>
        </div>

        {/* Botón de Acción ... (se mantiene igual) */}
        <div className="pt-4">
          <button
            onClick={onSavePayment}
            disabled={loading || !paymentFormData.loan_id || !paymentFormData.monto_pago}
            className="w-full py-5 rounded-[22px] font-black text-white uppercase tracking-[0.15em] text-sm shadow-xl shadow-indigo-200 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all transform active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle size={22} />}
            <span>Confirmar Registro de Pago</span>
          </button>
        </div>
      </div>

      <div className="p-5 bg-slate-50 border-t border-slate-100 text-center">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Apex Finance - Caja General</p>
      </div>
    </div>
  );
};

export default PaymentForm;