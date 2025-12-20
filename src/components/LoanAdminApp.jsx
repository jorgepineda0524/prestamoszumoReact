import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Home, Users, DollarSign, FileText, Settings, Trash2, Eye, Plus, TrendingUp, RefreshCw, Receipt, Clock, Calendar, UserCheck, Percent, FileSpreadsheet, Smartphone, X, Check, CheckCircle, Search, Sparkles, CreditCard, UserPlus } from 'lucide-react';
import { supabase } from '../supabaseClient';
import UserForm from './UserForm';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import PaymentForm from './PaymentForm';

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
  const [userSubTab, setUserSubTab] = useState('clientsList');
  const [showUserFormModal, setShowUserFormModal] = useState(false);
  const [formMode, setFormMode] = useState(null);
  const [selectedComisionista, setSelectedComisionista] = useState(null);
  const [selectedCommissions, setSelectedCommissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({
    loan_id: '',
    monto_pago: '',
    fecha_pago: new Date().toISOString().split('T')[0],
  });
  const [activeLoansList, setActiveLoansList] = useState([]);
  const [clientToEdit, setClientToEdit] = useState(null);
  const [comisionistas, setComisionistas] = useState([]);
  const [loanSubTab, setLoanSubTab] = useState('loansList');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const SECURITY_PIN = "9510";
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
    plazo_dias: '1',
    fecha_prestamo: new Date().toISOString().split('T')[0],
    comisionista_id: '',
    porcentaje_comision: '0',
    dia_cobro: 'Lunes'
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
    fetchComisionistas();
  }, [activeTab]);

  const handleVerifyPin = (enteredPin) => {
    if (enteredPin === SECURITY_PIN) {
      setIsAuthenticated(true);
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      setTimeout(() => {
        setPin('');
        Swal.fire({
          title: 'PIN Incorrecto',
          toast: true,
          position: 'top',
          showConfirmButton: false,
          timer: 1500,
          icon: 'error',
          background: '#1e293b',
          color: '#fff'
        });
      }, 300);
    }
  };

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

  const fetchComisionistas = async () => {
    try {
      const { data, error } = await supabase
        .from('comisionistas')
        .select(`
                  *,
                  registro_comisiones (
                      id,
                      monto_comision,
                      estado_pago,
                      prestamos (
                          id,
                          monto_prestado,
                          clientes (nombre)
                      )
                  )
              `)
        .eq('estado', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setComisionistas(data || []);
    } catch (error) {
      console.error('Error fetching comisionistas:', error.message);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('estado', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setClients(data || []);

    } catch (error) {
      // ...
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prestamos')
        .select('*, clientes(nombre)')
        .eq('estado', 'activo')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
      setActiveLoansList(data || []);

    } catch (error) {
      console.error("Error al cargar préstamos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = useMemo(() => {
    if (!searchTerm.trim()) return loans;

    const busqueda = searchTerm.toLowerCase().trim();

    return loans.filter(loan => {
      const nombreCliente = loan.clientes?.nombre?.toLowerCase() || '';
      const nombreComisionista = loan.nombre_comisionista?.toLowerCase() || '';

      return nombreCliente.includes(busqueda) || nombreComisionista.includes(busqueda);
    });
  }, [loans, searchTerm]);

  const handleOpenPayment = (loan) => {
    setSelectedLoanForPayment(loan);
    setIsPaymentModalOpen(true);
  };

  const handleEditClient = (client) => {
    setClientToEdit(client);
    setFormMode(client.hasOwnProperty('estado') ? 'client' : 'comisionista');
    setShowUserFormModal(true);
  };

  const handlePayCommissions = async () => {
    if (selectedCommissions.length === 0) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('registro_comisiones')
        .update({ estado_pago: 'pagado' })
        .in('id', selectedCommissions);

      if (error) throw error;

      Swal.fire({ title: 'Éxito', text: 'Comisiones liquidadas', icon: 'success', timer: 2000 });

      setSelectedCommissions([]);
      setSelectedComisionista(null);
      fetchComisionistas(); // Para refrescar los datos
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (clientData) => {
    setLoading(true);
    try {
      const isEditing = !!clientToEdit;

      const dataToSave = {
        nombre: clientData.nombre,
        cedula: clientData.cedula || null,
        telefono: clientData.telefono,
        direccion: clientData.direccion || null,
        email: clientData.email || null,
        estado: true
      };

      let error;

      if (isEditing) {
        const result = await supabase
          .from('clientes')
          .update(dataToSave)
          .eq('id', clientToEdit.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('clientes')
          .insert([dataToSave]);
        error = result.error;
      }

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: isEditing ? 'Cliente Actualizado' : 'Cliente Creado',
        text: isEditing ? 'Los datos se actualizaron correctamente.' : 'El cliente ha sido guardado exitosamente.',
        timer: 2000,
        showConfirmButton: false
      });

      fetchClients();
      setClientToEdit(null);
      setShowUserFormModal(false);
      setFormMode(null);

    } catch (error) {
      console.error("Error de Supabase:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = (clientId) => {
    Swal.fire({
      title: '¿Desactivar Cliente?',
      html: 'Se marcará este cliente como inactivo. Sus datos históricos se mantendrán.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Desactivar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        confirmButton: 'font-semibold px-4 py-2',
        cancelButton: 'font-semibold px-4 py-2'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const { error } = await supabase
            .from('clientes')
            .update({ estado: false })
            .eq('id', clientId);

          if (error) throw error;

          Swal.fire({
            title: '¡Desactivado!',
            text: 'El cliente ha sido marcado como inactivo.',
            icon: 'success',
            confirmButtonColor: '#10b981',
          });

          fetchClients();
        } catch (error) {
          console.error('Error al desactivar cliente:', error);
          Swal.fire('Error', `Ocurrió un error al desactivar: ${error.message}`, 'error');
        }
      }
    });
  };

  const handleSaveComisionista = async (comisionistaData) => {
    setLoading(true);
    try {
      const isEditing = !!clientToEdit;

      const dataToSave = {
        nombre: comisionistaData.nombre,
        cedula: comisionistaData.cedula || null,
        telefono: comisionistaData.telefono,
        email: comisionistaData.email || null,
        estado: true
      };

      let error;

      if (isEditing) {
        const result = await supabase
          .from('comisionistas')
          .update(dataToSave)
          .eq('id', clientToEdit.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('comisionistas')
          .insert([dataToSave]);
        error = result.error;
      }

      if (error) throw error;

      Swal.fire({
        title: 'Éxito',
        text: isEditing ? 'Comisionista actualizado correctamente.' : 'Comisionista guardado exitosamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

      fetchClients();
      fetchComisionistas();
      setShowUserFormModal(false);
      setFormMode(null);
      setClientToEdit(null);
    } catch (error) {
      console.error('Error guardando comisionista:', error);
      Swal.fire({
        title: 'Error',
        text: 'Error al procesar comisionista: ' + error.message,
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditComisionista = (comisionista) => {
    setClientToEdit(comisionista);
    setFormMode('comisionista');
    setShowUserFormModal(true);
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
        const configId = configRow.id;

        const { error: updateError } = await supabase
          .from('configuracion')
          .update({ capital_invertido: newAmount })
          .eq('id', configId);

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
      Swal.fire({ title: 'Éxito', text: 'Capital total actualizado exitosamente.', icon: 'success', timer: 4000, showConfirmButton: false })

    } catch (error) {
      console.error('Error al actualizar/insertar capital invertido:', error);
      Swal.fire({ title: 'Error', text: 'Error al guardar el capital: ' + error.message, icon: 'error', confirmButtonText: 'Entendido' })
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

  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const diaHoy = diasSemana[new Date().getDay()];

  const pagosHoy = loans.filter(loan => {
    if (loan.estado !== 'activo') return false;
    const modalidad = loan.modalidad?.toLowerCase();
    if (modalidad.includes('semanal')) return true;
    return loan.dia_pago?.toLowerCase() === diaHoy;
  });

  const formatInputCurrency = (amount) => {
    if (!amount || isNaN(parseFloat(amount))) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(parseFloat(amount));
  };

  const cleanCurrencyInput = (input) => {
    const cleaned = String(input).replace(/[$.]/g, '').replace(/[^0-9]/g, '');
    return parseInt(cleaned) || '';
  };

  const handlePaymentSubmit = async () => {
    const { loan_id, monto_pago, fecha_pago } = paymentFormData;
    const monto = parseFloat(monto_pago);

    if (!loan_id || monto <= 0 || !fecha_pago) {
      Swal.fire({ title: 'Error', text: 'Por favor selecciona un préstamo e ingresa un monto válido.', icon: 'error', confirmButtonText: 'Entendido' })
      return;
    }

    setLoading(true);
    try {
      const selectedLoan = loans.find(l => l.id.toString() === loan_id.toString());

      if (!selectedLoan) {
        Swal.fire({ title: 'Información', text: 'Préstamo no encontrado.', icon: 'info', timer: 4000, showConfirmButton: false })
        return;
      }

      if (monto > selectedLoan.saldo_pendiente) {
        Swal.fire({ title: 'Error', text: `El pago de ${formatCurrency(monto)} excede el saldo pendiente de ${formatCurrency(selectedLoan.saldo_pendiente)}.`, icon: 'error', confirmButtonText: 'Entendido' })
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

      Swal.fire({ title: 'Éxito', text: `Pago de ${formatCurrency(monto)} registrado. Nuevo saldo: ${formatCurrency(nuevoSaldo)}.`, icon: 'success', timer: 4000, showConfirmButton: false })

      setPaymentFormData({
        loan_id: '',
        monto_pago: '',
        fecha_pago: new Date().toISOString().split('T')[0],
      });

      fetchLoans();
      setActiveTab('loans');

    } catch (error) {
      console.error('Error procesando el pago:', error);
      Swal.fire({ title: 'Error', text: 'Error al procesar el pago: ' + error.message, icon: 'error', confirmButtonText: 'Entendido' })
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToPayment = (loanId) => {
    const selectedLoan = loans.find(l => String(l.id) === String(loanId));
    let montoSugerido = '';

    if (selectedLoan) {
      const totalSemanas = selectedLoan.plazo_dias / 7;
      montoSugerido = Math.round(selectedLoan.total_a_pagar / totalSemanas);
    }

    setActiveTab('payments');
    setPaymentFormData({
      loan_id: String(loanId),
      monto_pago: montoSugerido.toString(),
      fecha_pago: new Date().toISOString().split('T')[0],
    });
  };

  const calculateLoanDetails = () => {
    const monto = parseFloat(loanFormData.monto_prestado) || 0;
    const tasaTotal = parseFloat(loanFormData.tasa_interes) || 0;
    const porcentajeComision = parseFloat(loanFormData.porcentaje_comision) || 0;
    const numCiclos = parseInt(loanFormData.plazo_dias) || 1;
    const fechaBase = loanFormData.fecha_prestamo || new Date().toISOString().split('T')[0];
    const SEMANAS_POR_CICLO = 4;
    const interesTotal = monto * (tasaTotal / 100) * numCiclos;
    const totalCliente = monto + interesTotal;
    const plazoTotalSemanas = numCiclos * SEMANAS_POR_CICLO;
    const cuotaSemanal = (totalCliente > 0 && plazoTotalSemanas > 0)
      ? totalCliente / plazoTotalSemanas
      : 0;
    const fechaObjeto = new Date(fechaBase + 'T00:00:00');
    fechaObjeto.setDate(fechaObjeto.getDate() + (numCiclos * 28));
    const montoComision = monto * (porcentajeComision / 100) * numCiclos;
    const interesNetoDueno = interesTotal - montoComision;

    // fechaVen.setDate(fechaVen.getDate() + (numCiclos * 28));
    const fechaVencimientoFormatted = fechaObjeto.toISOString().split('T')[0];
    return {
      interes: interesTotal.toFixed(2),
      total: totalCliente.toFixed(2),
      cuotaSemanal: cuotaSemanal.toFixed(2),
      montoComision: montoComision.toFixed(2),
      interesNetoDueno: interesNetoDueno.toFixed(2),
      fechaVencimiento: fechaVencimientoFormatted
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

        Swal.fire({ title: 'Éxito', text: 'Cliente guardado exitosamente', icon: 'success', timer: 4000, showConfirmButton: false })

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
        Swal.fire({ title: 'Error', text: 'Error al guardar: ' + error.message, icon: 'error', confirmButtonText: 'Entendido' })
      } finally {
        setLoading(false);
      }
    } else {
      Swal.fire({ title: 'Error', text: 'Por favor completa todos los campos', icon: 'error', confirmButtonText: 'Entendido' })
    }
  };

  const handleLoanSubmit = async () => {
    if (!loanFormData.cliente_id || !loanFormData.monto_prestado || !loanFormData.tasa_interes) {
      Swal.fire({ title: 'Error', text: 'Por favor completa todos los campos requeridos', icon: 'error', confirmButtonText: 'Entendido' })
      return;
    }

    setLoading(true);
    try {
      const loanDetails = calculateLoanDetails();
      const numCiclos = parseInt(loanFormData.plazo_dias) || 1;
      const plazoTotalDias = numCiclos * 28;

      const loanData = {
        cliente_id: loanFormData.cliente_id,
        monto_prestado: parseFloat(loanFormData.monto_prestado),
        tasa_interes: parseFloat(loanFormData.tasa_interes),
        modalidad: 'Semanal',
        plazo_dias: plazoTotalDias,
        fecha_prestamo: loanFormData.fecha_prestamo,
        fecha_vencimiento: loanDetails.fechaVencimiento,
        total_a_pagar: parseFloat(loanDetails.total),
        saldo_pendiente: parseFloat(loanDetails.total),
        dia_cobro: loanFormData.dia_cobro,
        estado: 'activo'
      };

      const { data: prestamoData, error } = await supabase
        .from('prestamos')
        .insert([loanData])
        .select();

      if (error) throw error;

      const prestamoId = prestamoData[0].id;
      const montoComision = parseFloat(loanDetails.montoComision);

      if (loanFormData.comisionista_id && montoComision > 0) {
        const comisionData = {
          prestamo_id: prestamoId,
          comisionista_id: loanFormData.comisionista_id,
          monto_comision: parseFloat(loanDetails.montoComision),
          porcentaje_aplicado: parseFloat(loanFormData.porcentaje_comision),
          estado_pago: 'pendiente'
        };

        const { error: comisionError } = await supabase
          .from('registro_comisiones')
          .insert([comisionData]);

        if (comisionError) throw comisionError;
      }

      Swal.fire({ title: 'Éxito', text: 'Préstamo registrado exitosamente', icon: 'success', timer: 4000, showConfirmButton: false })
      fetchComisionistas();
      setLoanFormData({
        cliente_id: '',
        monto_prestado: '',
        tasa_interes: '',
        modalidad: 'mensual',
        plazo_dias: '30',
        fecha_prestamo: new Date().toISOString().split('T')[0],
        comisionista_id: '',
        porcentaje_comision: '0',
        dia_cobro: 'Lunes'
      });
      setShowLoanForm(false);
      fetchLoans();
    } catch (error) {
      console.error('Error guardando préstamo:', error);
      Swal.fire({ title: 'Error', text: 'Error al guardar préstamo: ' + error.message, icon: 'error', confirmButtonText: 'Entendido' })
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoan = (loanToDelete) => {
    // 1. Extraemos los datos correctamente (usando la relación de Supabase para el nombre)
    const montoPrestado = parseFloat(loanToDelete.monto_prestado) || 0;
    const nombreCliente = loanToDelete.clientes?.nombre || 'este cliente';

    Swal.fire({
      title: '¿ELIMINAR PRÉSTAMO?',
      html: `
        <div className="text-center">
          <p className="text-slate-600">El préstamo de <b className="text-slate-900">${nombreCliente}</b> será desactivado.</p>
          <p className="mt-2 text-blue-600 font-black">SE REINTEGRARÁN: ${formatCurrency(montoPrestado)}</p>
          <p className="mt-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest">Esta acción liberará el capital de inmediato</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1e293b', // Color Slate-900 (Apex Dark)
      cancelButtonColor: '#f43f5e',  // Color Rose-500
      confirmButtonText: 'SÍ, ELIMINAR',
      cancelButtonText: 'CANCELAR',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-[2.5rem] border-none shadow-2xl',
        confirmButton: 'rounded-2xl font-black uppercase text-xs tracking-widest px-6 py-4',
        cancelButton: 'rounded-2xl font-black uppercase text-xs tracking-widest px-6 py-4'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true); // Usamos tu estado global de carga

        try {
          // 2. Desactivamos el préstamo en la base de datos
          // Al pasar a 'inactivo', tus cálculos de "Saldo Disponible" 
          // se actualizarán automáticamente al refrescar.
          const { error: loanError } = await supabase
            .from('prestamos')
            .update({ estado: 'inactivo' })
            .eq('id', loanToDelete.id);

          if (loanError) throw loanError;

          // 3. Alerta de éxito con el nuevo diseño
          Swal.fire({
            title: '¡OPERACIÓN EXITOSA!',
            html: `<p className="text-sm font-bold text-slate-500 uppercase">El capital de ${formatCurrency(montoPrestado)} ha sido reintegrado.</p>`,
            icon: 'success',
            confirmButtonColor: '#2563eb',
            customClass: {
              popup: 'rounded-[2.5rem]',
              confirmButton: 'rounded-2xl font-black uppercase text-xs tracking-widest px-8 py-4'
            }
          });

          // 4. Refrescamos los datos para que el Home y las Listas se actualicen
          if (typeof fetchLoans === 'function') fetchLoans();
          if (typeof fetchTotalCapital === 'function') fetchTotalCapital(); // Ajustado al nombre real de tu función

        } catch (error) {
          console.error('Error al eliminar préstamo:', error);
          Swal.fire({
            title: 'ERROR',
            text: `No se pudo procesar: ${error.message}`,
            icon: 'error',
            confirmButtonColor: '#ef4444',
            customClass: { popup: 'rounded-[2rem]' }
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };
  const exportToExcel = () => {
    const dataToExport = loans.map((loan, index) => {
      const cuotaSemanal = loan.total_a_pagar / (loan.plazo_dias / 7);
      const progresoPago = ((loan.total_a_pagar - loan.saldo_pendiente) / loan.total_a_pagar) * 100;
      const interes = loan.total_a_pagar - loan.monto_prestado;
      const montoPagado = loan.total_a_pagar - loan.saldo_pendiente;

      return {
        'No.': index + 1,
        'Cliente': loan.clientes?.nombre || 'N/A',
        'Cédula': loan.clientes?.cedula || 'N/A',
        'Teléfono': loan.clientes?.telefono || 'N/A',
        'Dirección': loan.clientes?.direccion || 'N/A',
        'Email': loan.clientes?.email || 'N/A',
        'Monto Prestado': loan.monto_prestado,
        'Tasa Interés (%)': loan.tasa_interes,
        'Interés Generado': interes,
        'Total a Pagar': loan.total_a_pagar,
        'Monto Pagado': montoPagado,
        'Saldo Pendiente': loan.saldo_pendiente,
        'Cuota Semanal': Math.round(cuotaSemanal),
        'Progreso (%)': progresoPago.toFixed(2),
        'Plazo (Días)': loan.plazo_dias,
        'Plazo (Semanas)': loan.plazo_dias / 7,
        'Modalidad': loan.modalidad,
        'Estado': loan.estado,
        'Fecha Préstamo': loan.fecha_prestamo,
        'Fecha Vencimiento': loan.fecha_vencimiento,
        'Comisionista': loan.nombre_comisionista || 'N/A',
        'Comisión (%)': loan.porcentaje_comision || 0,
        'Monto Comisión': loan.monto_prestado * ((loan.porcentaje_comision || 0) / 100) * (loan.plazo_dias / 28)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    const columnWidths = [
      { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
      { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 15 }
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Préstamos');

    const fecha = new Date().toISOString().split('T')[0];
    const fileName = `Prestamos_${fecha}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  const activeLoans = loans.filter(l => l.estado === 'activo').length;
  const totalPrestado = loans.reduce((sum, l) => sum + (l.monto_prestado || 0), 0);
  const totalInteres = loans.reduce((sum, l) => sum + ((l.total_a_pagar || 0) - (l.monto_prestado || 0)), 0);
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
    switch (activeTab) {
      case 'home':
        return (
          <div className="p-6 space-y-8 pb-24">
            {/* 1. Encabezado de Bienvenida Estilo APEX */}
            <div className="flex flex-col items-center mb-2">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dashboard Principal</span>
              </div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic leading-none text-center">
                APEX <span className="text-blue-600">FINANCE</span>
              </h1>
              <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-4 rounded-full shadow-lg shadow-blue-100"></div>
            </div>

            {/* 2. Grid de Estadísticas Principales */}
            <div className="grid grid-cols-2 gap-4">
              {/* Préstamos Activos */}
              <div className="bg-white border border-slate-100 p-5 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute -right-2 -top-2 bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={24} className="text-blue-600 opacity-20" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Activos</p>
                <p className="text-4xl font-black text-slate-800 italic relative z-10">{activeLoans}</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase mt-2">Créditos vigentes</p>
              </div>

              {/* Total Clientes */}
              <div className="bg-white border border-slate-100 p-5 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                <div className="absolute -right-2 -top-2 bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users size={24} className="text-emerald-600 opacity-20" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Clientes</p>
                <p className="text-4xl font-black text-slate-800 italic relative z-10">{clients.length}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mt-2">Registrados</p>
              </div>
            </div>

            {/* 3. Tarjeta de Capital Grande (Estilo Dark Ajustes) */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
              <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-blue-600/20 rounded-full blur-[80px]"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md">
                    <DollarSign size={24} className="text-cyan-400" />
                  </div>
                  <p className="text-cyan-100 text-xs font-black uppercase tracking-widest leading-none">Capital Prestado</p>
                </div>

                <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-8 italic">
                  {formatCurrency(totalPrestado)}
                </p>

                <div className="grid grid-cols-1 gap-4 pt-6 border-t border-white/10">
                  <div className="flex justify-between items-center px-2">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1 text-left">Intereses Totales</p>
                      <p className="text-xl font-black text-orange-400 italic">{formatCurrency(totalInteres)}</p>
                    </div>
                    <TrendingUp size={32} className="text-orange-400/20" />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. COBROS DE HOY */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Cobros de Hoy</h2>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                    {diaHoy}, {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black italic shadow-lg shadow-blue-200">
                  {pagosHoy.length} PENDIENTES
                </div>
              </div>

              <div className="space-y-3">
                {pagosHoy.length > 0 ? (
                  pagosHoy.map((loan) => (
                    <div key={loan.id} className="bg-white border border-slate-100 p-5 rounded-[2.2rem] flex items-center justify-between shadow-sm group active:scale-95 transition-all">
                      <div className="flex items-center gap-4">
                        {/* Indicador de estado de pago */}
                        <div className="relative">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-blue-600 transition-colors">
                            <Clock size={24} className="text-slate-400 group-hover:text-white transition-colors" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 border-4 border-white rounded-full"></div>
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-slate-800 text-base truncate uppercase tracking-tight leading-none mb-1">
                            {loan.clientes?.nombre}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase">
                              {loan.modalidad}
                            </span>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                              Cuota: <span className="text-slate-900">{formatCurrency(loan.cuota_monto || (loan.total_a_pagar / loan.numero_cuotas))}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          // Aquí podrías abrir el modal de abono directamente
                          setSelectedLoan(loan);
                          setIsPaymentModalOpen(true);
                        }}
                        className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg hover:bg-blue-600 transition-all active:scale-90"
                      >
                        <DollarSign size={20} />
                      </button>
                    </div>
                  ))
                ) : (
                  /* Estado cuando no hay cobros */
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
                    <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <CheckCircle size={32} className="text-emerald-500" />
                    </div>
                    <p className="text-slate-800 text-sm font-black uppercase italic tracking-widest">¡Día Completado!</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">No hay cobros pendientes para hoy</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer sutil */}
            <div className="text-center pt-4 opacity-30">
              <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.4em]">Control de Activos v2.0</p>
            </div>
          </div>
        );

      case 'clients':
        return (
          <div className="p-6 relative pb-24">
            {/* 1. Encabezado Maestro Apex */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Directorio Central</span>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none text-center">
                Gestión de <span className="text-blue-600">Usuarios</span>
              </h1>
              <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-4 rounded-full shadow-lg shadow-blue-100"></div>
            </div>

            {/* 2. Botón Flotante (FAB) Estilo Premium */}
            <button
              onClick={() => {
                setShowUserFormModal(true);
                setFormMode(null);
              }}
              className="fixed bottom-24 right-6 z-[90] p-4 bg-slate-900 text-white rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all border border-white/10"
              title="Nuevo Registro"
            >
              <Plus size={28} strokeWidth={3} />
            </button>

            {!showUserFormModal && (
              <>
                {/* 3. Selector de Pestañas (Sub-Tabs) Estilo Pastilla */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200 max-w-sm mx-auto shadow-inner">
                  <button
                    onClick={() => setUserSubTab('clientsList')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userSubTab === 'clientsList' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    Clientes ({clients.length})
                  </button>
                  <button
                    onClick={() => setUserSubTab('comisionistasList')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userSubTab === 'comisionistasList' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    Socios ({comisionistas.length})
                  </button>
                </div>

                {/* 4. Lista de Clientes en Tarjetas */}
                {userSubTab === 'clientsList' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {loading ? (
                      <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Consultando registros...</div>
                    ) : clients.length === 0 ? (
                      <div className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-100">
                        <Users size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay clientes registrados</p>
                      </div>
                    ) : (
                      clients.map((client) => (
                        <div key={client.id} className="bg-white border border-slate-100 rounded-[1.8rem] p-4 flex items-center justify-between hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-600 font-black text-lg shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {client.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight leading-tight">{client.nombre}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                  <Smartphone size={12} className="text-blue-400" /> {client.telefono}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                  <CreditCard size={12} className="text-slate-300" /> {client.cedula || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditClient(client)}
                              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                            >
                              <Eye size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 5. Lista de Socios (Comisionistas) */}
                {userSubTab === 'comisionistasList' && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {comisionistas.length === 0 ? (
                      <div className="bg-white rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-100">
                        <Percent size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay socios activos</p>
                      </div>
                    ) : (
                      comisionistas.map((c) => (
                        <div key={c.id} className="bg-white border border-slate-100 rounded-[1.8rem] p-4 flex items-center justify-between hover:shadow-md transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600 font-black text-lg shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                              {c.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-800 text-sm truncate uppercase tracking-tight">{c.nombre}</p>
                                <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md font-black uppercase">Socio</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-slate-400">
                                <Smartphone size={12} className="text-emerald-400" /> {c.telefono}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditComisionista(c)}
                            className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-90"
                          >
                            <Eye size={20} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}

            {/* 6. Modal de Selección de tipo de Registro */}
            {showUserFormModal && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
                {formMode === null ? (
                  <div className="bg-white rounded-[2.5rem] max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-100">
                    <div className="p-8 text-center">
                      <div className="flex justify-center mb-6">
                        <div className="bg-blue-100 p-3 rounded-2xl">
                          <UserPlus size={32} className="text-blue-600" />
                        </div>
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase italic tracking-tight">Nuevo <span className="text-blue-600">Registro</span></h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Selecciona el perfil administrativo</p>

                      <div className="flex flex-col sm:flex-row justify-center gap-4 px-2">
                        <button
                          onClick={() => setFormMode('client')}
                          className="flex flex-col items-center justify-center p-6 flex-1 bg-slate-50 text-slate-800 rounded-[2rem] hover:bg-blue-600 hover:text-white transition-all shadow-sm group active:scale-95"
                        >
                          <Users size={32} className="text-blue-600 group-hover:text-white mb-2" />
                          <span className="font-black uppercase text-[10px] tracking-widest">Nuevo Cliente</span>
                        </button>
                        <button
                          onClick={() => setFormMode('comisionista')}
                          className="flex flex-col items-center justify-center p-6 flex-1 bg-slate-50 text-slate-800 rounded-[2rem] hover:bg-emerald-600 hover:text-white transition-all shadow-sm group active:scale-95"
                        >
                          <Percent size={32} className="text-emerald-600 group-hover:text-white mb-2" />
                          <span className="font-black uppercase text-[10px] tracking-widest">Nuevo Socio</span>
                        </button>
                      </div>
                      <button
                        onClick={() => setShowUserFormModal(false)}
                        className="mt-8 text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest transition-colors"
                      >
                        Regresar al panel
                      </button>
                    </div>
                  </div>
                ) : (
                  <UserForm
                    isComisionistaMode={formMode === 'comisionista'}
                    clientToEdit={clientToEdit}
                    onSaveClient={handleSaveClient}
                    onSaveComisionista={handleSaveComisionista}
                    loading={loading}
                    onCancel={() => {
                      setShowUserFormModal(false);
                      setClientToEdit(null);
                      setFormMode(null);
                    }}
                    onBackToSelection={() => setFormMode(null)}
                  />
                )}
              </div>
            )}
          </div>
        );

      case 'loans':
        return (
          <div className="p-6">
            {/* 1. Encabezado de Página Estilo Apex */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Gestión de Cartera</span>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">
                {loanSubTab === 'loansList' ? 'Control de' : 'Reporte de'}{' '}
                <span className="text-blue-600">
                  {loanSubTab === 'loansList' ? 'Préstamos' : 'Comisiones'}
                </span>
              </h1>
              <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-4 rounded-full shadow-lg shadow-blue-100"></div>
            </div>

            {/* 2. Barra de Herramientas (Buscador y Botón Nuevo) */}
            <div className="flex justify-between items-center mb-6 px-1">
              <button
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (showSearch) setSearchTerm('');
                }}
                className={`p-3 rounded-2xl transition-all shadow-sm ${showSearch
                  ? 'bg-blue-600 text-white shadow-blue-200'
                  : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-300'
                  }`}
              >
                <Search size={22} />
              </button>

              {loanSubTab === 'loansList' && (
                <button
                  onClick={() => setShowLoanForm(!showLoanForm)}
                  disabled={loading}
                  className={`px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-2 transition-all active:scale-95 ${showLoanForm
                    ? 'bg-white text-slate-500 border border-slate-200'
                    : 'bg-slate-900 text-white shadow-slate-200'
                    }`}
                >
                  {showLoanForm ? <X size={16} /> : <Plus size={16} />}
                  {showLoanForm ? 'Cerrar Formulario' : 'Nuevo Préstamo'}
                </button>
              )}
            </div>

            {/* 3. Buscador Expandible */}
            {showSearch && !showLoanForm && (
              <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Escribe el nombre del cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-[1.8rem] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all font-bold text-slate-700 shadow-sm"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={20} />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4. Selector de Pestañas (Sub-Tabs) Estilo Pastilla */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200 max-w-sm mx-auto shadow-inner">
              <button
                onClick={() => { setLoanSubTab('loansList'); setShowLoanForm(false); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loanSubTab === 'loansList' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                Préstamos
              </button>
              <button
                onClick={() => { setLoanSubTab('commissions'); setShowLoanForm(false); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${loanSubTab === 'commissions' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                Comisiones <Percent size={10} className="inline ml-1" />
              </button>
            </div>

            {/* 5. VISTA DE PRÉSTAMOS */}
            {loanSubTab === 'loansList' && (
              <>
                {/* FORMULARIO DE REGISTRO (Diseño Premium) */}
                {showLoanForm && (
                  <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-slate-100 mb-8 animate-in zoom-in duration-300">
                    <div className="p-8 pb-4 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-xl">
                          <DollarSign className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 uppercase italic leading-none">Apertura de Crédito</h3>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuración de nuevo préstamo</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 space-y-6">
                      {/* Cliente */}
                      <div className="group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Cliente Titular</label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={18} />
                          <select
                            name="cliente_id"
                            value={loanFormData.cliente_id}
                            onChange={handleLoanInputChange}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold appearance-none"
                          >
                            <option value="">Selecciona un cliente</option>
                            {clients.map((c) => (<option key={c.id} value={c.id}>{c.nombre} - {c.cedula}</option>))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Monto */}
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Monto a Prestar</label>
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-black">$</div>
                            <input
                              type="text" name="monto_prestado"
                              value={formatInputCurrency(loanFormData.monto_prestado)}
                              onChange={handleLoanInputChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-10 pr-4 text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        {/* Interés */}
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Interés (%)</label>
                          <div className="relative">
                            <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                              type="number" step="0.1" name="tasa_interes"
                              value={loanFormData.tasa_interes}
                              onChange={handleLoanInputChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        {/* Plazo */}
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Plazo (Ciclos de 4 sem)</label>
                          <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                              type="number" name="plazo_dias"
                              value={loanFormData.plazo_dias}
                              onChange={handleLoanInputChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        {/* Fecha */}
                        <div className="group">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Fecha de Inicio</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                              type="date" name="fecha_prestamo"
                              value={loanFormData.fecha_prestamo}
                              onChange={handleLoanInputChange}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Día de Cobro */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block text-center">Día de Cobro Semanal</label>
                        <div className="flex justify-between gap-1 sm:gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                          {[
                            { d: 'Lunes', c: 'bg-red-500' }, { d: 'Martes', c: 'bg-orange-500' }, { d: 'Miércoles', c: 'bg-yellow-500' },
                            { d: 'Jueves', c: 'bg-green-500' }, { d: 'Viernes', c: 'bg-blue-500' }, { d: 'Sábado', c: 'bg-indigo-500' },
                            { d: 'Domingo', c: 'bg-purple-500' }
                          ].map((item) => {
                            const isSelected = loanFormData.dia_cobro === item.d;
                            return (
                              <button
                                key={item.d} type="button"
                                onClick={() => setLoanFormData({ ...loanFormData, dia_cobro: item.d })}
                                className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-300 ${isSelected ? `${item.c} text-white shadow-md scale-105 z-10` : 'bg-white text-gray-400 hover:bg-slate-50'}`}
                              >
                                <span className="text-sm font-black">{item.d.charAt(0)}</span>
                                <span className="text-[7px] font-bold uppercase">{item.d.substring(0, 3)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Comisionista */}
                      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck size={16} className="text-emerald-500" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gestión de Comisión</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <select
                            name="comisionista_id"
                            value={loanFormData.comisionista_id}
                            onChange={handleLoanInputChange}
                            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-4 text-slate-700 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
                          >
                            <option value="">Sin Comisionista</option>
                            {comisionistas.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                          </select>

                          <div className="relative">
                            <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                            <input
                              type="number" name="porcentaje_comision"
                              value={loanFormData.porcentaje_comision}
                              onChange={handleLoanInputChange}
                              placeholder="% Comisión"
                              className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-10 pr-4 text-slate-700 font-bold outline-none focus:border-emerald-500 transition-all text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resumen Final */}
                      {/* 8. DETALLE FINANCIERO INTEGRADO (Estilo Fila por Fila) */}
                      {loanFormData.monto_prestado && loanFormData.tasa_interes && (
                        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-blue-100 shadow-inner animate-in fade-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="bg-blue-200 p-1.5 rounded-lg">
                              <TrendingUp size={16} className="text-blue-700" />
                            </div>
                            <h3 className="font-black text-blue-900 text-xs uppercase tracking-[0.2em]">Resumen de Operación</h3>
                          </div>

                          <div className="space-y-3">
                            {/* Monto Prestado */}
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Base</p>
                              <p className="font-bold text-slate-700 text-base">
                                {formatCurrency(parseFloat(loanFormData.monto_prestado) || 0)}
                              </p>
                            </div>

                            {/* Interés Generado */}
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interés Bruto</p>
                              <p className="font-bold text-orange-600 text-base">
                                +{formatCurrency(parseFloat(calculateLoanDetails().interes))}
                              </p>
                            </div>

                            {/* Comisión Socio */}
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comisión Socio</p>
                              <div className="text-right">
                                <p className="font-bold text-rose-500 text-base">
                                  -{formatCurrency(parseFloat(calculateLoanDetails().montoComision))}
                                </p>
                                <p className="text-[8px] text-rose-400 font-bold uppercase">{loanFormData.porcentaje_comision}% Aplicado</p>
                              </div>
                            </div>

                            {/* Ganancia Neta */}
                            <div className="flex justify-between items-center pb-2 border-b border-blue-100/50">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilidad Neta</p>
                              <p className="font-bold text-emerald-600 text-base">
                                {formatCurrency(parseFloat(calculateLoanDetails().interesNetoDueno))}
                              </p>
                            </div>

                            {/* TOTAL A PAGAR Y CUOTA (DESTACADOS) */}
                            <div className="mt-4 p-4 bg-white rounded-2xl border border-blue-100 shadow-sm space-y-3">
                              <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total a Pagar</p>
                                <p className="font-black text-slate-800 text-xl">
                                  {formatCurrency(parseFloat(calculateLoanDetails().total))}
                                </p>
                              </div>

                              <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Cuota Semanal</p>
                                <p className="font-black text-blue-600 text-2xl italic tracking-tighter">
                                  {formatCurrency(parseFloat(calculateLoanDetails().cuotaSemanal))}
                                </p>
                              </div>

                              <div className="mt-2 pt-2 border-t border-slate-50 flex justify-end gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                <Calendar size={12} className="text-blue-400" />
                                <span>Vence: {new Date(calculateLoanDetails().fechaVencimiento).toLocaleDateString('es-CO', { dateStyle: 'long' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botón Registrar */}
                      <button
                        onClick={handleLoanSubmit}
                        disabled={loading}
                        className="w-full py-5 rounded-[22px] font-black text-white uppercase tracking-[0.15em] text-sm shadow-xl shadow-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 active:scale-95 transition-all flex justify-center items-center gap-3"
                      >
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle size={22} />}
                        Registrar Crédito Maestro
                      </button>
                    </div>
                  </div>
                )}

                {/* TABLA DE PRÉSTAMOS (Sigue siendo tu tabla genial pero con bordes redondeados premium) */}
                <div className="bg-white rounded-[2.5rem] shadow-lg overflow-hidden border border-slate-100">
                  {loading ? (
                    <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest text-[10px]">Sincronizando base de datos...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Préstamo</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuota</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Progreso</th>
                            <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredLoans.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">No hay registros disponibles</td>
                            </tr>
                          ) : (
                            filteredLoans.map((loan) => {
                              const cuotaSemanal = loan.total_a_pagar / (loan.plazo_dias / 7);
                              const progresoPago = ((loan.total_a_pagar - loan.saldo_pendiente) / loan.total_a_pagar) * 100;
                              return (
                                <tr key={loan.id} className="hover:bg-blue-50/40 transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="cursor-pointer" onClick={() => handleNavigateToPayment(loan.id)}>
                                      <p className="font-bold text-slate-800 text-sm">{loan.clientes?.nombre}</p>
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <span className="bg-blue-50 text-blue-600 text-[9px] px-2 py-0.5 rounded-md font-black uppercase border border-blue-100">Cobra: {loan.dia_cobro}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-sm font-bold text-slate-700">
                                    {formatCurrency(loan.monto_prestado)}
                                    <span className="block text-[10px] text-orange-600 font-black">+{loan.tasa_interes}% INT</span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="bg-blue-600 text-white px-2.5 py-1.5 rounded-xl inline-block shadow-sm">
                                      <p className="text-[11px] font-black tracking-tight">{formatCurrency(cuotaSemanal)}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase mb-1">
                                      <span>Saldo: {formatCurrency(loan.saldo_pendiente)}</span>
                                    </div>
                                    <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progresoPago}%` }} />
                                    </div>
                                    <p className="text-[9px] font-black text-emerald-600 mt-1">{progresoPago.toFixed(0)}% Pagado</p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => setSelectedLoan(loan)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye size={18} /></button>
                                      <button onClick={() => handleDeleteLoan(loan)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <button
                  onClick={exportToExcel}
                  disabled={loading || loans.length === 0}
                  className="fixed bottom-24 right-6 z-40 p-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
                  title="Exportar a Excel"
                >
                  <FileSpreadsheet size={28} />
                </button>
              </>
            )}

            {/* 6. VISTA DE COMISIONES (Mantenemos tu lógica pero dentro del nuevo contenedor) */}
            {loanSubTab === 'commissions' && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-100">
                      <Percent size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-700 font-black uppercase tracking-[0.2em] mb-1">Deuda Global Socios</p>
                      <p className="text-3xl font-black text-emerald-900 italic">
                        {formatCurrency(comisionistas.reduce((acc, c) =>
                          acc + (c.registro_comisiones?.filter(r => r.estado_pago === 'pendiente')
                            .reduce((a, b) => a + b.monto_comision, 0) || 0), 0
                        ))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comisionistas.map(c => {
                    const pendientes = c.registro_comisiones?.filter(r => r.estado_pago === 'pendiente') || [];
                    const totalC = pendientes.reduce((acc, curr) => acc + curr.monto_comision, 0);
                    return (
                      <div key={c.id} className="bg-white border border-slate-100 rounded-[2rem] p-4 flex items-center justify-between hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 shadow-inner">
                            <span className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Items</span>
                            <span className="text-sm font-black text-slate-700 leading-none">{pendientes.length}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">{c.nombre}</h3>
                            <p className="text-emerald-600 font-black text-base italic">{formatCurrency(totalC)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedComisionista(c); setSelectedCommissions([]); }}
                          className="bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-500 p-3.5 rounded-2xl transition-all active:scale-90"
                        >
                          <Eye size={20} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* MODAL DE LIQUIDACIÓN DE COMISIONES - ESTILO APEX */}
                {selectedComisionista && (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:justify-end z-[150] animate-in fade-in duration-300">
                    <div className="bg-white h-[92vh] sm:h-full w-full sm:max-w-md shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-500 rounded-t-[3rem] sm:rounded-t-none sm:rounded-l-[3rem] overflow-hidden border-t border-slate-100">

                      <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 sm:hidden" />

                      {/* Header del Modal - Texto más grande */}
                      <div className="p-8 pb-4 bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="bg-emerald-100 p-4 rounded-2xl text-emerald-600 shadow-sm">
                              <UserCheck size={28} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight uppercase italic truncate max-w-[220px]">
                                {selectedComisionista.nombre}
                              </h2>
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Liquidación de Pagos</p>
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedComisionista(null); setSelectedCommissions([]); }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-all active:scale-90"
                          >
                            <X size={28} />
                          </button>
                        </div>
                      </div>

                      {/* Lista de Registros - Tarjetas más legibles */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Seleccione comisiones a pagar:</p>

                        {selectedComisionista.registro_comisiones
                          ?.sort((a, b) => (a.estado_pago === 'pendiente' ? -1 : 1))
                          .map((reg) => {
                            const isPagada = reg.estado_pago === 'pagado';
                            const isSelected = selectedCommissions.includes(reg.id);

                            return (
                              <div
                                key={reg.id}
                                onClick={() => !isPagada && (isSelected
                                  ? setSelectedCommissions(prev => prev.filter(id => id !== reg.id))
                                  : setSelectedCommissions(prev => [...prev, reg.id]))}
                                className={`p-6 rounded-[2rem] border-2 transition-all duration-300 active:scale-[0.97] ${isPagada
                                  ? 'bg-slate-100 border-transparent opacity-50'
                                  : isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100'
                                    : 'bg-white border-white hover:border-blue-200 cursor-pointer shadow-sm'
                                  }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="min-w-0">
                                    <p className={`text-base font-black uppercase tracking-tight truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                      {reg.prestamos?.clientes?.nombre || 'Cliente Final'}
                                    </p>
                                    <p className={`text-sm font-black mt-1 ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
                                      {formatCurrency(reg.monto_comision)}
                                    </p>
                                  </div>
                                  {isSelected ? (
                                    <CheckCircle size={26} className="text-white" />
                                  ) : !isPagada ? (
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        <div className="h-20" />
                      </div>

                      {/* Footer del Modal - Resumen de Pago Muy Claro */}
                      <div className="p-8 pb-14 sm:pb-10 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[160]">
                        <div className="flex justify-between items-end mb-8 px-2">
                          <div>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Monto Total</p>
                            <p className="text-4xl font-black text-slate-900 italic leading-none">
                              {formatCurrency(selectedComisionista.registro_comisiones?.filter(r => selectedCommissions.includes(r.id)).reduce((acc, curr) => acc + curr.monto_comision, 0) || 0)}
                            </p>
                          </div>
                          <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-tighter shadow-lg">
                            {selectedCommissions.length} ITEMS
                          </div>
                        </div>

                        <button
                          onClick={handlePayCommissions}
                          disabled={selectedCommissions.length === 0 || loading}
                          className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all flex justify-center items-center gap-4 shadow-xl shadow-blue-200 active:scale-95"
                        >
                          {loading ? (
                            <RefreshCw className="animate-spin" size={24} />
                          ) : (
                            <Check size={24} strokeWidth={4} />
                          )}
                          <span>CONFIRMAR LIQUIDACIÓN</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'payments':
        const selectedLoanObject = loans.find(l => String(l.id) === String(paymentFormData.loan_id));

        return (
          <div className="p-6">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={18} className="text-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Módulo de Recaudo</span>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">
                Gestión de <span className="text-emerald-600">Pagos</span>
              </h1>
              <div className="h-1.5 w-16 bg-emerald-600 mx-auto mt-4 rounded-full shadow-lg shadow-emerald-100"></div>
            </div>

            {/* LLAMADA AL COMPONENTE EXTERNO */}
            <div className="flex justify-center">
              <PaymentForm
                loans={activeLoansList.length > 0 ? activeLoansList : loans}
                selectedLoan={selectedLoanObject}
                loading={loading}
                onInputChange={(name, value) => {
                  setPaymentFormData(prev => ({ ...prev, [name]: value }));
                }}
                onSavePayment={handlePaymentSubmit}
                paymentFormData={paymentFormData}
                formatCurrency={formatCurrency}
              />
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
            formatInputCurrency={formatInputCurrency}
            cleanCurrencyInput={cleanCurrencyInput}
            // AGREGAR ESTAS TRES LÍNEAS:
            onLogout={() => setIsAuthenticated(false)}
            securityPin={SECURITY_PIN}
            onUpdatePin={(newPin) => {
              // Aquí podrías agregar la lógica de Supabase para guardar el PIN si lo deseas
              Swal.fire('Éxito', `PIN actualizado a: ${newPin}`, 'success');
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {!isAuthenticated ? (
        <LoginScreen
          pin={pin}
          setPin={setPin}
          onVerify={handleVerifyPin}
        />
      ) : (
        /* 2. SI ESTÁ AUTENTICADO, RENDERIZA TODO LO DEMÁS */
        <>
          <div className="max-w-7xl mx-auto pb-20">
            {renderContent()}
          </div>

          <nav className="fixed bottom-0 left-0 right-0 z-[120] bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
            <div className="max-w-md mx-auto flex justify-around items-center h-20 px-2 relative">

              {[
                { id: 'home', icon: Home, label: 'Inicio', color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'clients', icon: Users, label: 'Usuarios', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { id: 'loans', icon: DollarSign, label: 'Créditos', color: 'text-violet-600', bg: 'bg-violet-50' },
                { id: 'payments', icon: Receipt, label: 'Caja', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { id: 'settings', icon: Settings, label: 'Ajustes', color: 'text-slate-800', bg: 'bg-slate-100' }
              ].map((tab) => {
                const IsActive = activeTab === tab.id;
                const IconComponent = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300"
                  >
                    {/* Bloque de Fondo Activo */}
                    <div className={`absolute inset-y-2 inset-x-1 rounded-2xl transition-all duration-300 ${IsActive ? `${tab.bg} opacity-100 scale-100` : 'bg-transparent opacity-0 scale-95'
                      }`} />

                    {/* Contenedor de Icono y Texto */}
                    <div className={`relative z-10 flex flex-col items-center gap-1 transition-transform duration-300 ${IsActive ? 'scale-105' : 'scale-100'
                      }`}>
                      <IconComponent
                        size={22}
                        strokeWidth={IsActive ? 3 : 2}
                        className={IsActive ? tab.color : 'text-slate-400'}
                      />

                      <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${IsActive ? tab.color : 'text-slate-400'
                        }`}>
                        {tab.label}
                      </span>
                    </div>

                    {/* Barrita indicadora superior */}
                    <div className={`absolute top-0 w-8 h-1 rounded-b-full transition-all duration-500 ${IsActive ? `${tab.bg.replace('50', '600')} opacity-100` : 'opacity-0'
                      }`} />
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}
    </div>
  );
};

const SettingsPage = ({ totalCapital, onUpdateCapital, loading, formatCurrency, saldoDisponible, totalSaldoPendiente, formatInputCurrency, cleanCurrencyInput, onLogout, securityPin, onUpdatePin }) => {
  const [newCapital, setNewCapital] = useState(totalCapital.toString());

  useEffect(() => {
    setNewCapital(totalCapital.toString());
  }, [totalCapital]);

  const handleInputChange = (e) => {
    const displayValue = e.target.value;
    const numericValue = cleanCurrencyInput(displayValue);
    setNewCapital(numericValue);
  };

  const handleSave = () => {
    const value = parseFloat(newCapital);
    if (!isNaN(value) && value >= 0) {
      onUpdateCapital(value);
    } else {
      Swal.fire({ title: 'Error', text: 'Por favor, ingresa un valor numérico válido.', icon: 'error', confirmButtonText: 'Entendido' })
    }
  };

  const isDisabled = loading || parseFloat(newCapital) === totalCapital || !newCapital || parseFloat(newCapital) <= 0;

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto pb-24">
      {/* Encabezado Principal Apex Style */}
      <div className="flex flex-col items-center mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Panel de Control</span>
        </div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic leading-none text-center">
          Configuración <span className="text-blue-600">Global</span>
        </h1>
        <div className="h-1.5 w-16 bg-blue-600 mx-auto mt-4 rounded-full shadow-lg shadow-blue-100"></div>
      </div>

      {/* Resumen de Capital - Tarjeta Flotante Dark */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-blue-600/20 rounded-full blur-[60px]"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md">
              <TrendingUp size={24} className="text-cyan-400" />
            </div>
            <p className="text-cyan-100 text-xs font-black uppercase tracking-widest">Saldo Disponible</p>
          </div>

          <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-6 leading-none">
            {formatCurrency(saldoDisponible)}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Capital Invertido</p>
              <p className="text-sm font-black text-white">{formatCurrency(totalCapital)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">En Préstamos</p>
              <p className="text-sm font-black text-rose-400">{formatCurrency(totalSaldoPendiente)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de Actualización de Capital */}
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <RefreshCw className="text-blue-600" size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic">Inversión</h3>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-12">Modificar capital operativo del sistema</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Monto de Capital</label>
            <div className="relative">
              <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500 font-bold" size={20} />
              <input
                type="text"
                value={formatInputCurrency(newCapital)}
                onChange={handleInputChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-5 pl-12 pr-6 text-slate-700 text-xl font-black outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isDisabled}
            className="w-full py-5 rounded-[22px] font-black text-white uppercase tracking-[0.15em] text-sm shadow-xl shadow-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all transform active:scale-95 disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-3"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} strokeWidth={3} />}
            <span>Aplicar Cambio de Capital</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN DE SEGURIDAD (PIN) */}
      <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Smartphone className="text-amber-600" size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic">Seguridad</h3>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-12">Control de acceso administrativo</p>
        </div>

        <div className="p-8 space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Actualizar PIN de Acceso</label>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength="4"
                id="newPinInput"
                placeholder="****"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-4 text-center text-xl font-black tracking-[1em] outline-none focus:bg-white focus:border-amber-500 transition-all"
                onKeyPress={(e) => !/[0-9]/.test(e.key) && e.preventDefault()}
              />
              <button
                onClick={() => {
                  const val = document.getElementById('newPinInput').value;
                  if (val.length === 4) onUpdatePin(val);
                  else Swal.fire('Error', 'El PIN debe ser de 4 dígitos', 'error');
                }}
                className="bg-slate-900 text-white px-6 rounded-2xl font-black uppercase text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
              >
                Cambiar
              </button>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95"
          >
            <X size={16} strokeWidth={3} /> Bloquear Aplicación
          </button>
        </div>
      </div>

      <div className="text-center pt-4 opacity-50">
        <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.5em]">Apex Finance v2.0 • Secured Environment</p>
      </div>
    </div>
  );
};

const LoginScreen = ({ pin, setPin, onVerify }) => {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "delete"];

  const handlePress = (val) => {
    if (val === "delete") {
      setPin(pin.slice(0, -1));
    } else if (val !== "" && pin.length < 4) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) onVerify(newPin);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center z-[1000] p-6 overflow-hidden">
      {/* Efectos de Luces de Fondo (Acorde a tu gradiente de Apex) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]"></div>

      <div className="relative flex flex-col items-center w-full max-w-xs animate-in fade-in zoom-in duration-500">
        {/* Logo / Icono Superior */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-[2.5rem] mb-8 shadow-2xl shadow-blue-500/20 border border-white/10">
          <Smartphone className="text-white" size={42} />
        </div>

        <h1 className="text-white text-3xl font-black tracking-tighter mb-2 italic">
          APEX <span className="text-cyan-400">FINANCE</span>
        </h1>
        <p className="text-slate-400 text-sm font-medium mb-12 tracking-widest uppercase">Seguridad Requerida</p>

        {/* Visualizador de PIN (Círculos que brillan) */}
        <div className="flex gap-6 mb-16">
          {[1, 2, 3, 4].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${pin.length > i
                ? 'bg-cyan-400 border-cyan-400 scale-125 shadow-[0_0_20px_rgba(34,211,238,0.8)]'
                : 'border-slate-700 bg-transparent'
                }`}
            ></div>
          ))}
        </div>

        {/* Teclado Numérico Estilizado */}
        <div className="grid grid-cols-3 gap-5 w-full">
          {digits.map((d, i) => (
            <button
              key={i}
              onClick={() => handlePress(d)}
              className={`h-20 w-20 rounded-3xl flex items-center justify-center text-2xl font-bold transition-all active:scale-90 active:bg-blue-600 ${d === "" ? "opacity-0 pointer-events-none" :
                d === "delete" ? "text-slate-400 hover:text-white" :
                  "text-white bg-slate-800/40 hover:bg-slate-800/60 border border-white/5 backdrop-blur-md shadow-sm"
                }`}
            >
              {d === "delete" ? <X size={28} /> : d}
            </button>
          ))}
        </div>

        <p className="mt-12 text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
          Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};

export default LoanAdminApp;