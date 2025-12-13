import React, { useState, useEffect } from 'react';
import { Home, Users, DollarSign, FileText, Settings, Trash2, Eye, Plus,TrendingUp, RefreshCw, Receipt } from 'lucide-react';
import { supabase } from '../supabaseClient';

const LoanAdminApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [totalCapital, setTotalCapital] = useState(0); 
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    loan_id: '',
    monto_pago: '',
    fecha_pago: new Date().toISOString().split('T')[0],
  });
  const [activeLoansList, setActiveLoansList] = useState([]);
  
  const [formData, setFormData] = useState({
    nombre: '',
    cedula: '',
    telefono: '',
    direccion: '',
    email: ''
  });

  const [loanFormData, setLoanFormData] = useState({
    cliente_id: '',
    monto_prestado: '',
    tasa_interes: '',
    // modalidad: 'Ciclos_4_Semanas',
    plazo_dias: '1',
    fecha_prestamo: new Date().toISOString().split('T')[0],
    nombre_comisionista: '', 
    porcentaje_comision: '0'
  });

  useEffect(() => {
    if (activeTab === 'clients') {
      fetchClients();
    } else if (activeTab === 'loans') {
      fetchLoans();
      fetchClients();
    } else if (activeTab === 'home') {
      fetchClients();
      fetchLoans();
    }

    fetchTotalCapital();
  }, [activeTab]);

  const fetchTotalCapital = async () => {
      try {
          const { data, error } = await supabase
              .from('configuracion')
              .select('capital_invertido')
              .limit(1)
              .maybeSingle(); 

          if (error) throw error; 
          
          if (data) {
              setTotalCapital(data.capital_invertido || 0);
          } else {
              setTotalCapital(0); 
          }
      } catch (error) {
          console.error('Error cargando capital total:', error);
      }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          clientes (
            nombre,
            cedula,
            telefono
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLoans(data || []);
      const active = (data || []).filter(l => l.saldo_pendiente > 0);
      setActiveLoansList(active);
    } catch (error) {
      console.error('Error cargando préstamos:', error);
      alert('Error al cargar préstamos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCapital = async (newAmount) => {
      try {
          const { data: configRow, error: fetchError } = await supabase
              .from('configuracion')
              .select('id')
              .limit(1)
              .maybeSingle(); 

          if (fetchError) throw fetchError;
          
          if (configRow) {
              const configId = configRow.id; // El UUID real

              const { error: updateError } = await supabase
                  .from('configuracion')
                  .update({ capital_invertido: newAmount })
                  .eq('id', configId); // Usando el UUID para la actualización

              if (updateError) throw updateError;
              console.log('Capital actualizado correctamente (Update).');
              
          } else {
              const { error: insertError } = await supabase
                  .from('configuracion')
                  .insert([
                      { capital_invertido: newAmount }
                  ]); 

              if (insertError) throw insertError;
              console.log('Capital insertado correctamente (Insert).');
          }

          setTotalCapital(newAmount);
          alert('Capital total actualizado exitosamente.');

      } catch (error) {
        console.error('Error al actualizar/insertar capital invertido:', error);
        alert('Error al guardar el capital: ' + error.message);
      } finally {
          setSettingsLoading(false); 
      }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

const handleLoanInputChange = (e) => {
      const { name, value } = e.target;
      let newValue = value;

      if (name === 'monto_prestado') {
          const rawValue = value.replace(/[^0-9]/g, ''); 
          setLoanFormData(prevData => ({
              ...prevData,
              [name]: rawValue
          }));
          return; 
      }
      
      setLoanFormData(prevData => ({
          ...prevData,
          [name]: newValue
      }));
  };

const handlePaymentInputChange = (e) => {
      const { name, value } = e.target;
      let newValue = value;

      if (name === 'monto_pago') {
          const rawValue = value.replace(/[^0-9]/g, ''); 
          setPaymentFormData(prevData => ({
              ...prevData,
              [name]: rawValue
          }));
          return;
      }

      setPaymentFormData(prevData => ({
          ...prevData,
          [name]: newValue
      }));
  };

  const formatInputCurrency = (amount) => {
      if (!amount || isNaN(parseFloat(amount))) return '';
      return new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
      }).format(parseFloat(amount));
  };

  const handlePaymentSubmit = async () => {
      const { loan_id, monto_pago, fecha_pago } = paymentFormData;
      const monto = parseFloat(monto_pago);

      if (!loan_id || monto <= 0 || !fecha_pago) {
          alert('Por favor selecciona un préstamo e ingresa un monto válido.');
          return;
      }

      setLoading(true);
      try {
          const selectedLoan = loans.find(l => l.id.toString() === loan_id.toString());

          if (!selectedLoan) {
              alert('Préstamo no encontrado.');
              return;
          }

          if (monto > selectedLoan.saldo_pendiente) {
              alert(`El pago de ${formatCurrency(monto)} excede el saldo pendiente de ${formatCurrency(selectedLoan.saldo_pendiente)}.`);
              return;
          }

          const nuevoSaldo = selectedLoan.saldo_pendiente - monto;
          const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : 'activo';
          const { error: paymentError } = await supabase
              .from('pagos')
              .insert([
                  {
                      prestamo_id: loan_id,
                      monto_pagado: monto,
                      fecha_pago: fecha_pago,
                      saldo_anterior: selectedLoan.saldo_pendiente,
                      saldo_nuevo: nuevoSaldo,
                  }
              ]);

          if (paymentError) throw paymentError;
          const { error: loanUpdateError } = await supabase
              .from('prestamos')
              .update({
                  saldo_pendiente: nuevoSaldo,
                  estado: nuevoEstado
              })
              .eq('id', loan_id);

          if (loanUpdateError) throw loanUpdateError;

          alert(`Pago de ${formatCurrency(monto)} registrado. Nuevo saldo: ${formatCurrency(nuevoSaldo)}.`);
          
          setPaymentFormData({
              loan_id: '',
              monto_pago: '',
              fecha_pago: new Date().toISOString().split('T')[0],
          });
          
          fetchLoans();
          setActiveTab('loans');
          
      } catch (error) {
          console.error('Error procesando el pago:', error);
          alert('Error al procesar el pago: ' + error.message);
      } finally {
          setLoading(false);
      }
  };

  const handleNavigateToPayment = (loanId) => {
      setActiveTab('payments');
      setPaymentFormData(prevData => ({
          ...prevData,
          loan_id: loanId,
          monto_pago: '', 
      }));
  };  

  const calculateLoanDetails = () => {
    const monto = parseFloat(loanFormData.monto_prestado) || 0;
    const tasaTotal = parseFloat(loanFormData.tasa_interes) || 0;
    const porcentajeComision = parseFloat(loanFormData.porcentaje_comision) || 0; 
    const numCiclos = parseInt(loanFormData.plazo_dias) || 1; 
    const DIAS_POR_CICLO = 28;
    const SEMANAS_POR_CICLO = 4;
    const interesTotal = monto * (tasaTotal / 100) * numCiclos;
    const totalCliente = monto + interesTotal;
    const plazoTotalSemanas = numCiclos * SEMANAS_POR_CICLO; 
    const cuotaSemanal = (totalCliente > 0 && plazoTotalSemanas > 0) 
                        ? totalCliente / plazoTotalSemanas 
                        : 0;
    const montoComision = monto * (porcentajeComision / 100) * numCiclos; 
    const interesNetoDueno = interesTotal - montoComision; 
    
    return {
      interes: interesTotal.toFixed(2), 
      total: totalCliente.toFixed(2),   
      cuotaSemanal: cuotaSemanal.toFixed(2),
      montoComision: montoComision.toFixed(2),
      interesNetoDueno: interesNetoDueno.toFixed(2)
    };
  };

  const handleSubmit = async () => {
    if (formData.nombre && formData.cedula && formData.telefono && formData.direccion && formData.email) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clientes')
          .insert([formData])
          .select();
        
        if (error) throw error;
        
        alert('Cliente guardado exitosamente');
        setFormData({
          nombre: '',
          cedula: '',
          telefono: '',
          direccion: '',
          email: ''
        });
        setShowForm(false);
        fetchClients();
      } catch (error) {
        console.error('Error guardando cliente:', error);
        alert('Error al guardar: ' + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      alert('Por favor completa todos los campos');
    }
  };

  const handleLoanSubmit = async () => {
    if (!loanFormData.cliente_id || !loanFormData.monto_prestado || !loanFormData.tasa_interes) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const { total, fechaVencimiento } = calculateLoanDetails();
      
      const numCiclos = parseInt(loanFormData.plazo_dias) || 1;
      const plazoTotalDias = numCiclos * 28;

      const loanData = {
        cliente_id: loanFormData.cliente_id,
        monto_prestado: parseFloat(loanFormData.monto_prestado),
        tasa_interes: parseFloat(loanFormData.tasa_interes),
        modalidad: 'Semanal',
        plazo_dias: plazoTotalDias,
        fecha_prestamo: loanFormData.fecha_prestamo,
        fecha_vencimiento: fechaVencimiento,
        total_a_pagar: parseFloat(total),
        saldo_pendiente: parseFloat(total),
        estado: 'activo',
        nombre_comisionista: loanFormData.nombre_comisionista || 'N/A', 
        porcentaje_comision: parseFloat(loanFormData.porcentaje_comision) || 0
      };

      const { data, error } = await supabase
        .from('prestamos')
        .insert([loanData])
        .select();
      
      if (error) throw error;
      
      alert('Préstamo registrado exitosamente');
      setLoanFormData({
        cliente_id: '',
        monto_prestado: '',
        tasa_interes: '',
        modalidad: 'mensual',
        plazo_dias: '30',
        fecha_prestamo: new Date().toISOString().split('T')[0]
      });
      setShowLoanForm(false);
      fetchLoans();
    } catch (error) {
      console.error('Error guardando préstamo:', error);
      alert('Error al guardar préstamo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        alert('Cliente eliminado');
        fetchClients();
      } catch (error) {
        console.error('Error eliminando cliente:', error);
        alert('Error al eliminar: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteLoan = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este préstamo?')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('prestamos')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        alert('Préstamo eliminado');
        fetchLoans();
      } catch (error) {
        console.error('Error eliminando préstamo:', error);
        alert('Error al eliminar: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const activeLoans = loans.filter(l => l.estado === 'activo').length;
  const totalPrestado = loans.reduce((sum, l) => sum + (l.monto_prestado || 0), 0);
  const totalInteres = loans.reduce((sum, l) => sum + ((l.total_a_pagar || 0) - (l.monto_prestado || 0)), 0);
  // const saldoDisponible = totalCapital - totalPrestado;
  const totalMontoInicialPrestado = loans.reduce((sum, l) => sum + (l.monto_prestado || 0), 0);
  const totalSaldoPendiente = loans.reduce((sum, l) => sum + (l.saldo_pendiente || 0), 0);
  const totalMontoCobrado = loans.reduce((sum, l) => {
      return sum + ((l.total_a_pagar || 0) - (l.saldo_pendiente || 0));
  }, 0);
  const totalRegresado = loans.reduce((sum, l) => {
      const montoPagado = (l.total_a_pagar || 0) - (l.saldo_pendiente || 0);
      return sum + montoPagado;
  }, 0);
  const totalInteresGenerado = loans.reduce((sum, l) => sum + ((l.total_a_pagar || 0) - (l.monto_prestado || 0)), 0);
  const saldoDisponible = totalCapital + totalInteresGenerado - totalSaldoPendiente;
  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Panel Principal</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-lg mb-1">Préstamos Activos</p>
                      <p className="text-4xl font-bold">{activeLoans}</p>
                    </div>
                    <FileText size={48} className="opacity-80" />
                  </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-lg mb-1">Total Clientes</p>
                      <p className="text-4xl font-bold">{clients.length}</p>
                    </div>
                    <Users size={48} className="opacity-80" />
                  </div>
              </div>

              <div className="bg-gradient-to-br from-rose-400 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-lg mb-1">Capital Prestado</p>
                      <p className="text-3xl font-bold">{formatCurrency(totalPrestado)}</p>
                    </div>
                    <DollarSign size={48} className="opacity-80" />
                  </div>
              </div>

              <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-lg mb-1">Intereses Total</p>
                      <p className="text-3xl font-bold">{formatCurrency(totalInteres)}</p>
                    </div>
                    <TrendingUp size={48} className="opacity-80" />
                  </div>
              </div>

            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Préstamos Recientes</h2>
              <div className="space-y-3">
                {loans.slice(0, 5).map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <DollarSign size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{loan.clientes?.nombre}</p>
                        <p className="text-sm text-gray-500">{formatCurrency(loan.monto_prestado)} • {loan.modalidad}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(loan.total_a_pagar)}</p>
                      <p className="text-xs text-gray-500">{loan.estado}</p>
                    </div>
                  </div>
                ))}
                {loans.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No hay préstamos registrados</p>
                )}
              </div>
            </div>
          </div>
        );

      case 'clients':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
              <button
                onClick={() => setShowForm(!showForm)}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {showForm ? 'Cancelar' : '+ Nuevo Cliente'}
              </button>
            </div>

            {showForm && (
              <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Nuevo Cliente</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Completo</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cédula</label>
                    <input
                      type="text"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 1234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 300 123 4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: Calle 123 # 45-67"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: juan@ejemplo.com"
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar Cliente'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Nombre</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Cédula</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Teléfono</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          No hay clientes registrados. Agrega tu primer cliente.
                        </td>
                      </tr>
                    ) : (
                      clients.map((client) => (
                        <tr key={client.id} className="border-t hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-800">{client.nombre}</td>
                          <td className="px-6 py-4 text-gray-600">{client.cedula}</td>
                          <td className="px-6 py-4 text-gray-600">{client.telefono}</td>
                          <td className="px-6 py-4 text-gray-600">{client.email}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'loans':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">Préstamos</h1>
              <button
                onClick={() => setShowLoanForm(!showLoanForm)}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Plus size={20} />
                {showLoanForm ? 'Cancelar' : 'Nuevo Préstamo'}
              </button>
            </div>

            {showLoanForm && (
              <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Nuevo Préstamo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente</label>
                    <select
                      name="cliente_id"
                      value={loanFormData.cliente_id}
                      onChange={handleLoanInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Selecciona un cliente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.nombre} - {client.cedula}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Monto a Prestar</label>
                      <input
                          type="text" 
                          name="monto_prestado"
                          value={formatInputCurrency(loanFormData.monto_prestado)} 
                          onChange={handleLoanInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                          placeholder="Ej: $ 1.000.000" 
                      />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Tasa de Interés (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="tasa_interes"
                      value={loanFormData.tasa_interes}
                      onChange={handleLoanInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 10"
                    />
                  </div>

                  {/* <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Modalidad de Interés</label>
                    <select
                      name="modalidad"
                      value={loanFormData.modalidad}
                      onChange={handleLoanInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="mensual">Mensual</option>
                      <option value="total">Total (una sola vez)</option>
                    </select>
                  </div> */}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Plazo (Ciclos de 4 Semanas)</label>
                    <input
                      type="number"
                      name="plazo_dias"
                      value={loanFormData.plazo_dias}
                      onChange={handleLoanInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 2 (que son 8 semanas)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Inicio</label>
                    <input
                      type="date"
                      name="fecha_prestamo"
                      value={loanFormData.fecha_prestamo}
                      onChange={handleLoanInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Comisionista (Nombre)</label>
                      <input
                        type="text"
                        name="nombre_comisionista"
                        value={loanFormData.nombre_comisionista}
                        onChange={handleLoanInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                        placeholder="Ej: Pedro García"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Comisión % (por ciclo)</label>
                      <input
                        type="number"
                        step="0.1"
                        name="porcentaje_comision"
                        value={loanFormData.porcentaje_comision}
                        onChange={handleLoanInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                        placeholder="Ej: 5"
                      />
                    </div>
                 </div>   
                  {/* <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha Limite</label>
                    <input
                      type="date"
                      name="fecha_vencimiento"
                      value={loanFormData.fecha_vencimiento}
                      onChange={handleLoanInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div> */}

                  {loanFormData.monto_prestado && loanFormData.tasa_interes && (
                    <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl">
                      <h3 className="font-bold text-gray-800 mb-2">Resumen del Préstamo</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-gray-600">Monto prestado:</p>
                        <p className="font-semibold text-right text-gray-800">{formatCurrency(parseFloat(loanFormData.monto_prestado) || 0)}</p>
                        <p className="text-gray-600">Interés:</p>
                        <p className="font-semibold text-right text-orange-600">{formatCurrency(parseFloat(calculateLoanDetails().interes))}</p>
                        <p className="font-bold text-red-600">Comisión ({loanFormData.porcentaje_comision}%):</p>
                        <p className="font-bold text-right text-red-600">{formatCurrency(parseFloat(calculateLoanDetails().montoComision))}</p>
                        <p className="text-gray-600">Interés Neto (Dueño):</p>
                        <p className="font-semibold text-right text-blue-800">{formatCurrency(parseFloat(calculateLoanDetails().interesNetoDueno))}</p>
                        <hr className="col-span-2 border-blue-200 my-1" />
                        <p className="text-gray-600">Total a pagar:</p>
                        <p className="font-bold text-right text-green-600">{formatCurrency(parseFloat(calculateLoanDetails().total))}</p>
                        <p className="font-bold text-gray-800">Cuota Semanal:</p>
                        <p className="font-extrabold text-right text-green-700 text-lg">{formatCurrency(parseFloat(calculateLoanDetails().cuotaSemanal))}</p>
                        <p className="text-gray-600">Fecha vencimiento:</p>
                        <p className="font-semibold text-right text-blue-700">{calculateLoanDetails().fechaVencimiento}</p>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <button
                      onClick={handleLoanSubmit}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Guardando...' : 'Registrar Préstamo'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Cargando préstamos...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Cliente</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Monto</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Interés</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Total</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Saldo Pendiente</th> 
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Modalidad</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Estado</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loans.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                            No hay préstamos registrados. Crea el primer préstamo.
                          </td>
                        </tr>
                      ) : (
                        loans.map((loan) => (
                          <tr key={loan.id} className="border-t hover:bg-gray-50">
                            <td 
                                className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" 
                                onClick={() => handleNavigateToPayment(loan.id)}
                            >
                                <div>
                                    <p className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                        {loan.clientes?.nombre}
                                    </p>
                                    <p className="text-sm text-gray-500">{loan.clientes?.telefono}</p>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-gray-800 font-semibold">
                              {formatCurrency(loan.monto_prestado)}
                            </td>
                            <td className="px-6 py-4 text-orange-600 font-semibold">
                              {loan.tasa_interes}% {loan.modalidad}
                            </td>
                            <td className="px-6 py-4 text-green-600 font-bold">
                              {formatCurrency(loan.total_a_pagar)}
                            </td>
                            <td className="px-6 py-4 text-red-600 font-extrabold"> 
                                {formatCurrency(loan.saldo_pendiente)}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {loan.plazo_dias} días
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs rounded-full ${
                                loan.estado === 'activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.estado}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedLoan(loan)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <Eye size={20} />
                                </button>
                                <button
                                  onClick={() => handleDeleteLoan(loan.id)}
                                  disabled={loading}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedLoan && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Detalle del Préstamo</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Cliente</p>
                      <p className="font-semibold text-gray-800">{selectedLoan.clientes?.nombre}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Monto prestado</p>
                        <p className="font-semibold text-gray-800">{formatCurrency(selectedLoan.monto_prestado)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Interés</p>
                        <p className="font-semibold text-orange-600">
                          {formatCurrency(selectedLoan.total_a_pagar - selectedLoan.monto_prestado)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total a pagar</p>
                      <p className="font-bold text-2xl text-green-600">{formatCurrency(selectedLoan.total_a_pagar)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Tasa</p>
                        <p className="font-semibold text-gray-800">{selectedLoan.tasa_interes}% {selectedLoan.modalidad}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Plazo</p>
                        <p className="font-semibold text-gray-800">{selectedLoan.plazo_dias} días</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-600">Fecha préstamo</p>
                        <p className="font-semibold text-gray-800">{selectedLoan.fecha_prestamo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vencimiento</p>
                        <p className="font-semibold text-gray-800">{selectedLoan.fecha_vencimiento}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Saldo pendiente</p>
                      <p className="font-bold text-xl text-blue-600">{formatCurrency(selectedLoan.saldo_pendiente)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLoan(null)}
                    className="w-full mt-6 bg-gray-600 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-all"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'payments':
      return (
          <div className="p-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Registro de Pagos</h1>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg max-w-xl mx-auto">
                  <div className="flex items-center gap-4 mb-4 border-b pb-4">
                      <Receipt size={32} className="text-indigo-600" />
                      <h2 className="text-xl font-bold text-gray-700">Registrar Cuota de Préstamo</h2>
                  </div>

                  <div className="space-y-4">
                      {/* Campo 1: Selección del Préstamo */}
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Seleccionar Préstamo</label>
                          <select
                              name="loan_id"
                              value={paymentFormData.loan_id}
                              onChange={handlePaymentInputChange} 
                              disabled={loading}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                          >
                              <option value="">Buscar préstamo...</option>
                              {activeLoansList.map((loan) => (
                                  <option key={loan.id} value={loan.id}>
                                      {loan.clientes?.nombre} - Saldo: {formatCurrency(loan.saldo_pendiente)}
                                  </option>
                              ))} 
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Monto a Pagar (COP)</label>
                          <input
                              type="text" 
                              name="monto_pago"
                              value={formatInputCurrency(paymentFormData.monto_pago)} 
                              onChange={handlePaymentInputChange}
                              disabled={loading}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                              placeholder="Ej: $ 50.000"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha del Pago</label>
                          <input
                              type="date"
                              name="fecha_pago"
                              value={paymentFormData.fecha_pago}
                              onChange={handlePaymentInputChange}
                              disabled={loading}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                          />
                      </div>
                      
                      <button
                          onClick={handlePaymentSubmit}
                          disabled={loading || !paymentFormData.loan_id || !paymentFormData.monto_pago}
                          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 mt-4"
                      >
                          {loading ? 'Procesando...' : 'Registrar Pago'}
                      </button>
                  </div>
              </div>
          </div>
      );

      case 'settings':
        return (
            <SettingsPage
                totalCapital={totalCapital}
                onUpdateCapital={handleUpdateCapital}
                loading={settingsLoading}
                formatCurrency={formatCurrency}
                saldoDisponible={saldoDisponible}
                totalSaldoPendiente={totalSaldoPendiente}
            />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto pb-20">
        {renderContent()}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around items-center h-20">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Home size={24} />
              <span className="text-xs font-semibold">Inicio</span>
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'clients' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={24} />
              <span className="text-xs font-semibold">Clientes</span>
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'loans' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <DollarSign size={24} />
              <span className="text-xs font-semibold">Préstamos</span>
            </button>
            <button
                onClick={() => setActiveTab('payments')} 
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    activeTab === 'payments' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Receipt size={24} /> 
                <span className="text-xs font-semibold">Pagos</span> 
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all ${
                activeTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings size={24} />
              <span className="text-xs font-semibold">Ajustes</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

const SettingsPage = ({ totalCapital, handleUpdateCapital, loading, formatCurrency, saldoDisponible, totalSaldoPendiente }) => {
    const [newCapital, setNewCapital] = useState(totalCapital.toString());
    useEffect(() => {
        setNewCapital(totalCapital.toString());
    }, [totalCapital]);
    const handleSave = () => {
        const value = parseFloat(newCapital);
        if (!isNaN(value) && value >= 0) {
            handleUpdateCapital(value);
        } else {
            alert('Por favor, ingresa un valor numérico válido para el capital.');
        }
    };

    return (
        <div className="p-6 space-y-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Configuración</h1>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-indigo-200 text-lg mb-1">Saldo Disponible para Prestar</p>
                        <p className="text-4xl font-bold">
                            {formatCurrency(saldoDisponible)}
                        </p>
                    </div>
                    <DollarSign size={48} className="opacity-80" />
                </div>
                <div className="mt-4 pt-3 border-t border-indigo-400">
                    <p className="text-sm text-indigo-100">
                        Capital Total: <span className="font-semibold">{formatCurrency(totalCapital)}</span>
                    </p>
                    <p className="text-sm text-indigo-100">
                        Total Pendiente de Regresar: <span className="font-semibold">{formatCurrency(totalSaldoPendiente)}</span>
                    </p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 max-w-lg">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                        <RefreshCw className="mr-3 text-red-500" size={20} />
                        Actualizar Capital Invertido
                    </h3>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                    Monto total de capital que tienes disponible para prestar.
                </p>

                <div className="flex space-x-4 items-center mb-4">
                    <input
                        type="number"
                        step="1000"
                        value={newCapital}
                        onChange={(e) => setNewCapital(e.target.value)}
                        placeholder="Ej. 30000000"
                        className="flex-grow p-3 border-2 border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-gray-900"
                    />
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-200 disabled:bg-red-300 flex items-center justify-center gap-2"
                        disabled={loading || parseFloat(newCapital) === totalCapital || newCapital.trim() === ''}
                    >
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>

                <p className="mt-3 text-lg text-gray-600">
                    Capital Actual: <span className="font-bold text-red-600">{formatCurrency(totalCapital)}</span>
                </p>
            </div>
        </div>
    );
};

export default LoanAdminApp;