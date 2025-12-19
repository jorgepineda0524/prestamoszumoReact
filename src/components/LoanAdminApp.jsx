import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Home, Users, DollarSign, FileText, Settings, Trash2, Eye, Plus, TrendingUp, RefreshCw, Receipt, Clock, Calendar, UserCheck, Percent, FileSpreadsheet, Smartphone, X, Check, CheckCircle, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';
import UserForm from './UserForm';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

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
  const [paymentFormData, setPaymentFormData] = useState({
    loan_id: '',
    monto_pago: '',
    fecha_pago: new Date().toISOString().split('T')[0],
  });
  const [activeLoansList, setActiveLoansList] = useState([]); 
  const [clientToEdit, setClientToEdit] = useState(null);
  const [comisionistas, setComisionistas] = useState([]); 
  const [loanSubTab, setLoanSubTab] = useState('loansList');
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
    fetchComisionistas();
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
        porcentaje_comision: '0'
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
      const montoPrestado = loanToDelete.monto_prestado; 
      Swal.fire({
          title: '¿Eliminar Préstamo?',
          html: `
              <p>El préstamo a ${loanToDelete.cliente_nombre} será desactivado. 
              El monto de ${formatCurrency(montoPrestado)} será reintegrado al capital disponible.</p>
              <p class="mt-2 font-semibold text-red-600">Esta acción no se puede deshacer.</p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',  
          confirmButtonText: 'Sí, Eliminar y Reintegrar',
          cancelButtonText: 'Cancelar',
          reverseButtons: true,
          customClass: {
              popup: 'rounded-xl shadow-2xl', 
              confirmButton: 'font-semibold px-4 py-2',
              cancelButton: 'font-semibold px-4 py-2'
          }
      }).then(async (result) => {
          
          if (result.isConfirmed) {
              
              let loadingToast;
              try {
                  loadingToast = Swal.fire({
                      title: 'Procesando...',
                      text: 'Eliminando préstamo y reintegrando capital. Por favor, espere.',
                      allowOutsideClick: false,
                      showConfirmButton: false,
                      didOpen: () => {
                          Swal.showLoading()
                      }
                  });
                  const { error: loanError } = await supabase
                      .from('prestamos')
                      .update({ estado: 'inactivo' }) 
                      .eq('id', loanToDelete.id);

                  if (loanError) throw loanError;
                  const nuevoCapitalDisponible = capitalDisponible + montoPrestado;

                  const { error: configError } = await supabase
                      .from('configuracion_capital')
                      .update({ capital_disponible: nuevoCapitalDisponible })
                      .eq('id', 1);

                  if (configError) throw configError;

                  loadingToast.close(); 
                  
                  Swal.fire({
                      title: '¡Eliminado y Reintegrado!',
                      html: `El préstamo ha sido desactivado y **${formatCurrency(montoPrestado)}** ha sido reintegrado al capital.`,
                      icon: 'success',
                      confirmButtonColor: '#10b981',
                  });
                  
                  fetchLoans(); 
                  fetchCapitalConfig();
                  
              } catch (error) {
                  loadingToast.close();
                  console.error('Error al eliminar préstamo y reintegrar capital:', error);
                  Swal.fire('Error', `Ocurrió un error al procesar la eliminación: ${error.message}`, 'error');
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
    switch(activeTab) {
      case 'home':
        return (
          <div className="p-6">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-8">
                <span className="
                    bg-clip-text text-transparent 
                    bg-gradient-to-r from-white via-cyan-300 to-blue-600 
                    // Usamos una sombra de brillo (glow) para el efecto neón sin ser excesivo
                    drop-shadow-[0_2px_15px_rgba(59,130,246,0.6)] 
                    
                    // TIPOGRAFÍA: Fuente Sans-Serif (Máximo Peso y compacto)
                    font-sans uppercase 
                ">
                    Apex
                </span>
            </h1>
            
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
            <div className="p-6 relative"> 
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Clientes Registrados</h1>
                <button
                    onClick={() => {
                        setShowUserFormModal(true);
                        setFormMode(null);
                    }}
                    className="fixed bottom-20 right-6 z-40 p-4 bg-green-600 text-white rounded-full shadow-2xl hover:bg-green-700 transition-all transform hover:scale-105"
                    title="Nuevo Usuario"
                >
                    <Plus size={28} /> 
                </button>
                
                {!showUserFormModal && (
                    <>
                        <div className="flex border-b border-gray-200 mb-6">
                            <button
                                onClick={() => setUserSubTab('clientsList')}
                                className={`pb-3 px-4 font-semibold text-sm transition-colors ${
                                    userSubTab === 'clientsList' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Clientes ({clients.length})
                            </button>
                            <button
                                onClick={() => setUserSubTab('comisionistasList')}
                                className={`pb-3 px-4 font-semibold text-sm transition-colors ${
                                    userSubTab === 'comisionistasList' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Comisionistas ({comisionistas.length})
                            </button>
                        </div>

                {userSubTab === 'clientsList' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {loading ? (
                          <div className="p-8 text-center text-gray-500">Cargando...</div>
                      ) : clients.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                              <Users size={40} className="mx-auto text-gray-300 mb-2" />
                              <p>No hay clientes.</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-gray-100">
                              {clients.map((client) => (
                                  <div key={client.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                      {/* Info Principal: Avatar e Identidad */}
                                      <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                              <span className="text-blue-600 font-bold text-sm">
                                                  {client.nombre.charAt(0).toUpperCase()}
                                              </span>
                                          </div>
                                          <div className="min-w-0">
                                              <p className="font-bold text-gray-900 truncate text-sm sm:text-base">
                                                  {client.nombre}
                                              </p>
                                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                                  <Smartphone size={12} /> {client.telefono}
                                              </div>
                                          </div>
                                      </div>

                                      {/* Acciones Compactas */}
                                      <div className="flex items-center gap-1 ml-2">
                                          <button
                                              onClick={() => handleEditClient(client)}
                                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                              title="Ver/Editar"
                                          >
                                              <Eye size={20} />
                                          </button>
                                          <button
                                              onClick={() => handleDeleteClient(client.id)}
                                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                                              title="Eliminar"
                                          >
                                              <Trash2 size={20} />
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              )}

                {userSubTab === 'comisionistasList' && (
                            <div className="bg-white rounded-2xl shadow-lg p-6">
                                <p className="text-gray-500 mb-4">Solo se muestran comisionistas activos.</p>
                                <div className="space-y-4">
                                    {comisionistas.map((c) => (
                                        <div key={c.id} className="flex justify-between items-center p-3 border-b hover:bg-gray-50 rounded-lg transition-colors">
                                            <div>
                                                <p className="font-semibold text-gray-800">{c.nombre}</p>
                                                <p className="text-sm text-gray-500">Celular: {c.telefono}</p>
                                            </div>
                                            <button
                                                onClick={() => handleEditComisionista(c)} 
                                                className="text-indigo-600 hover:text-indigo-800 mr-3"
                                                title="Ver Detalle"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {comisionistas.length === 0 && (
                                    <p className="text-center text-gray-500 py-4">No hay comisionistas activos.</p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {showUserFormModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                            
                            {formMode === null && (
                                <div className="p-6 text-center">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6">¿Qué deseas crear?</h2>
                                    <div className="flex justify-center gap-6">
                                        <button 
                                            onClick={() => setFormMode('client')}
                                            className="flex flex-col items-center justify-center p-6 w-1/2 bg-blue-100 text-blue-800 rounded-xl hover:bg-blue-200 transition-colors shadow-md"
                                        >
                                            <Users size={32} />
                                            <span className="font-semibold mt-2">Nuevo Cliente</span>
                                        </button>
                                        <button 
                                            onClick={() => setFormMode('comisionista')}
                                            className="flex flex-col items-center justify-center p-6 w-1/2 bg-green-100 text-green-800 rounded-xl hover:bg-green-200 transition-colors shadow-md"
                                        >
                                            <Percent size={32} />
                                            <span className="font-semibold mt-2">Nuevo Comisionista</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowUserFormModal(false)}
                                        className="mt-6 text-gray-500 hover:text-gray-700 text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            {formMode !== null && (
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
                    </div>
                )}
            </div>
      );

      case 'loans':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800">
                  {loanSubTab === 'loansList' ? 'Préstamos' : 'Comisiones'}
              </h1>
              <div className="flex gap-2">
                {loanSubTab === 'loansList' && (
                        <button
                            onClick={() => {
                                setShowSearch(!showSearch);
                                if (showSearch) setSearchTerm(''); // Resetea el texto al cerrar
                            }}
                            className={`p-2 rounded-xl transition-all ${showSearch ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            <Search size={22} />
                        </button>
                )}

                {loanSubTab === 'loansList' && (
                    <button
                        onClick={() => setShowLoanForm(!showLoanForm)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        <Plus size={20} />
                        {showLoanForm ? 'Cancelar' : 'Nuevo'}
                    </button>
                )}
              </div>
            </div>

            {showSearch && loanSubTab === 'loansList' && !showLoanForm && (
                <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="relative">
                        <input
                            key="search-input-loans" 
                            type="text"
                            placeholder="Escribe el nombre del cliente..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                            }}
                            className="w-full pl-12 pr-10 py-4 bg-white border-2 border-blue-100 rounded-2xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none shadow-sm text-gray-900"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
                        
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => { setLoanSubTab('loansList'); setShowLoanForm(false); }} // Al cambiar, ocultamos el formulario
                    className={`pb-3 px-4 font-semibold text-sm transition-colors ${
                        loanSubTab === 'loansList' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Préstamos Activos
                </button>
                <button
                    onClick={() => { setLoanSubTab('commissions'); setShowLoanForm(false); }}
                    className={`pb-3 px-4 font-semibold text-sm transition-colors ${
                        loanSubTab === 'commissions' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Comisiones (<Percent size={14} className="inline-block mb-1" />)
                </button>
            </div>

            {loanSubTab === 'loansList' && (<>      
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Comisionista</label>
                      <select
                        name="comisionista_id" 
                        value={loanFormData.comisionista_id}
                        onChange={handleLoanInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Selecciona (Opcional)</option>
                        {comisionistas.map((comisionista) => (
                        <option key={comisionista.id} value={comisionista.id}>
                          {comisionista.nombre}
                        </option>
                    ))}
                      </select>
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
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Préstamo</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Cuota Semanal</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Progreso</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLoans.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                            No hay préstamos registrados. Crea el primer préstamo.
                          </td>
                        </tr>
                      ) : (
                        filteredLoans.map((loan) => {
                          const cuotaSemanal = loan.total_a_pagar / (loan.plazo_dias / 7);
                          const progresoPago = ((loan.total_a_pagar - loan.saldo_pendiente) / loan.total_a_pagar) * 100;
                          
                          return (
                            <tr key={loan.id} className="hover:bg-blue-50 transition-colors">
                              {/* CLIENTE */}
                              <td className="px-4 py-3">
                                <div 
                                  className="cursor-pointer"
                                  onClick={() => handleNavigateToPayment(loan.id)}
                                >
                                  <p className="font-semibold text-indigo-600 hover:text-indigo-800 text-sm">
                                    {loan.clientes?.nombre}
                                  </p>
                                  <p className="text-xs text-gray-500">{loan.clientes?.telefono}</p>
                                </div>
                              </td>

                              {/* PRÉSTAMO */}
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-gray-800">
                                      {formatCurrency(loan.monto_prestado)}
                                    </span>
                                    <span className="text-xs text-orange-600 font-semibold">
                                      +{loan.tasa_interes}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock size={12} />
                                    <span>{loan.plazo_dias} días</span>
                                  </div>
                                </div>
                              </td>

                              {/* CUOTA SEMANAL */}
                              <td className="px-4 py-3">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-lg inline-block">
                                  <p className="text-xs font-medium mb-0.5">Cuota Semanal</p>
                                  <p className="text-lg font-bold">
                                    {formatCurrency(cuotaSemanal)}
                                  </p>
                                </div>
                              </td>

                              {/* PROGRESO */}
                              <td className="px-4 py-3">
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600 font-medium">Saldo</span>
                                    <span className="font-bold text-red-600">
                                      {formatCurrency(loan.saldo_pendiente)}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all"
                                      style={{ width: `${progresoPago}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500">{progresoPago.toFixed(0)}% pagado</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      loan.estado === 'activo' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {loan.estado}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* ACCIONES */}
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => setSelectedLoan(loan)}
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Ver detalle"
                                  >
                                    <Eye size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLoan(loan)}
                                    disabled={loading}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={18} />
                                  </button>
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

            {selectedLoan && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <DollarSign size={28} />
                      Detalle del Préstamo
                    </h2>
                    <p className="text-blue-100 mt-1">{selectedLoan.clientes?.nombre}</p>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={16} className="text-green-600" />
                          <p className="text-xs text-gray-600 font-semibold">Monto Prestado</p>
                        </div>
                        <p className="text-xl font-bold text-gray-800">
                          {formatCurrency(selectedLoan.monto_prestado)}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp size={16} className="text-orange-600" />
                          <p className="text-xs text-gray-600 font-semibold">Interés</p>
                        </div>
                        <p className="text-xl font-bold text-orange-600">
                          {formatCurrency(selectedLoan.total_a_pagar - selectedLoan.monto_prestado)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{selectedLoan.tasa_interes}% {selectedLoan.modalidad}</p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={16} className="text-blue-600" />
                          <p className="text-xs text-gray-600 font-semibold">Total a Pagar</p>
                        </div>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(selectedLoan.total_a_pagar)}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign size={16} className="text-red-600" />
                          <p className="text-xs text-gray-600 font-semibold">Saldo Pendiente</p>
                        </div>
                        <p className="text-xl font-bold text-red-600">
                          {formatCurrency(selectedLoan.saldo_pendiente)}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={16} className="text-purple-600" />
                          <p className="text-xs text-gray-600 font-semibold">Plazo</p>
                        </div>
                        <p className="text-xl font-bold text-purple-600">
                          {selectedLoan.plazo_dias / 7} sem
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{selectedLoan.plazo_dias} días</p>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar size={16} className="text-indigo-600" />
                          <p className="text-xs text-gray-600 font-semibold">Estado</p>
                        </div>
                        <p className={`text-lg font-bold capitalize ${
                          selectedLoan.estado === 'activo' ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {selectedLoan.estado}
                        </p>
                      </div>
                    </div>

                    {/* Cuota Semanal Destacada */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100 text-sm font-medium mb-1">Cuota Semanal</p>
                          <p className="text-4xl font-bold">
                            {formatCurrency(selectedLoan.total_a_pagar / (selectedLoan.plazo_dias / 7))}
                          </p>
                          <p className="text-blue-200 text-sm mt-2">
                            Durante {selectedLoan.plazo_dias / 7} semanas
                          </p>
                        </div>
                        <DollarSign size={64} className="opacity-20" />
                      </div>
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Fecha Préstamo</p>
                        <p className="text-lg font-bold text-gray-800">
                          {new Date(selectedLoan.fecha_prestamo).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-xs text-gray-600 font-semibold mb-1">Vencimiento</p>
                        <p className="text-lg font-bold text-gray-800">
                          {new Date(selectedLoan.fecha_vencimiento).toLocaleDateString('es-CO', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Comisión */}
                    {selectedLoan.porcentaje_comision > 0 && (
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center gap-2 mb-3">
                          <UserCheck size={18} className="text-orange-600" />
                          <p className="text-sm font-bold text-gray-800">Información de Comisión</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Comisionista</p>
                            <p className="font-semibold text-gray-800">{selectedLoan.nombre_comisionista}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Porcentaje</p>
                            <p className="font-semibold text-orange-600">{selectedLoan.porcentaje_comision}%</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Barra de Progreso */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-gray-700">Progreso de Pago</p>
                        <p className="text-sm font-bold text-green-600">
                          {(((selectedLoan.total_a_pagar - selectedLoan.saldo_pendiente) / selectedLoan.total_a_pagar) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all"
                          style={{ width: `${((selectedLoan.total_a_pagar - selectedLoan.saldo_pendiente) / selectedLoan.total_a_pagar) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-600">
                        <span>Pagado: {formatCurrency(selectedLoan.total_a_pagar - selectedLoan.saldo_pendiente)}</span>
                        <span>Pendiente: {formatCurrency(selectedLoan.saldo_pendiente)}</span>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        {(() => {
                          const totalSemanas = selectedLoan.plazo_dias / 7;
                          const valorCuota = selectedLoan.total_a_pagar / totalSemanas;
                          const montoPagado = selectedLoan.total_a_pagar - selectedLoan.saldo_pendiente;
                          const cuotasPagadas = Math.floor(montoPagado / valorCuota);
                          return (
                            <div className="flex justify-center items-center gap-2">
                              <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
                                Lleva {cuotasPagadas} pagadas, de {totalSemanas} 
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 bg-gray-50 border-t">
                    <button
                      onClick={() => setSelectedLoan(null)}
                      className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-3 rounded-xl font-bold hover:from-gray-700 hover:to-gray-800 transition-all"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={exportToExcel}
              disabled={loading || loans.length === 0}
              className="fixed bottom-24 right-6 z-40 p-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full shadow-2xl hover:shadow-3xl hover:from-green-700 hover:to-emerald-800 transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Exportar a Excel"
            >
              <FileSpreadsheet size={28} />
            </button>
            </>
            )}

          {loanSubTab === 'commissions' && (
            <div className="space-y-4">
              {/* Encabezado informativo corto */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-xl text-white">
                    <Percent size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Resumen de Deuda</p>
                    <p className="text-xl font-black text-emerald-800">
                      {formatCurrency(comisionistas.reduce((acc, c) => 
                        acc + (c.registro_comisiones?.filter(r => r.estado_pago === 'pendiente')
                        .reduce((a, b) => a + b.monto_comision, 0) || 0), 0
                      ))}
                    </p>
                  </div>
                </div>
              </div>

              {comisionistas.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">No hay comisionistas para mostrar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {comisionistas.map(c => {
                    const pendientes = c.registro_comisiones?.filter(r => r.estado_pago === 'pendiente') || [];
                    const totalC = pendientes.reduce((acc, curr) => acc + curr.monto_comision, 0);

                    return (
                      <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center justify-between hover:border-blue-300 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 leading-none mb-1">CANT</span>
                            <span className="text-sm font-black text-slate-700 leading-none">{pendientes.length}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">{c.nombre}</h3>
                            <p className="text-emerald-600 font-black text-sm">{formatCurrency(totalC)}</p>
                          </div>
                        </div>

                        <button 
                          onClick={() => {
                            setSelectedComisionista(c);
                            setSelectedCommissions([]);
                          }}
                          className="bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-500 p-3 rounded-xl transition-all active:scale-90"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MODAL LATERAL DE DETALLE DE COMISIONES */}
              {selectedComisionista && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-end z-[100] animate-in fade-in duration-300">
                  <div className="bg-white h-full w-full max-w-md shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[40px] overflow-hidden">
                    
                    {/* Header Estilizado */}
                    <div className="p-8 pb-6 border-b border-slate-50 bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-200">
                          <UserCheck size={24} />
                        </div>
                        <button 
                          onClick={() => { setSelectedComisionista(null); setSelectedCommissions([]); }}
                          className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                        >
                          <X size={24} />
                        </button>
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedComisionista.nombre}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">
                          CC: {selectedComisionista.cedula}
                        </span>
                      </div>
                    </div>

                    {/* Lista de Comisiones con scroll suave */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-2">Historial de comisiones</p>
                      
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
                              className={`group relative p-5 rounded-[24px] border-2 transition-all duration-300 ${
                                isPagada 
                                  ? 'bg-white/50 border-transparent opacity-60 grayscale' 
                                  : isSelected 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]' 
                                    : 'bg-white border-white hover:border-blue-200 cursor-pointer shadow-sm hover:shadow-md'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start gap-3">
                                  {!isPagada && (
                                    <div className={`mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      isSelected ? 'bg-white border-white text-blue-600' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                      {isSelected && <Check size={12} strokeWidth={4} />}
                                    </div>
                                  )}
                                  <div>
                                    <p className={`text-sm font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                      {reg.prestamos?.clientes?.nombre || 'Cliente Final'}
                                    </p>
                                    <p className={`text-[10px] font-medium mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                      Monto Préstamo: {formatCurrency(reg.prestamos?.monto_prestado || 0)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-base font-black ${isSelected ? 'text-white' : 'text-blue-600'}`}>
                                    {formatCurrency(reg.monto_comision)}
                                  </p>
                                  {isPagada && (
                                    <span className="text-[9px] font-black uppercase text-emerald-500 mt-1 block">Liquidado</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Footer / Resumen de Pago */}
                    <div className="p-8 bg-white border-t border-slate-100">
                      <div className="flex justify-between items-center mb-6 px-2">
                        <div>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total a pagar</p>
                          <p className="text-3xl font-black text-slate-900">
                            {formatCurrency(selectedComisionista.registro_comisiones?.filter(r => selectedCommissions.includes(r.id)).reduce((acc, curr) => acc + curr.monto_comision, 0) || 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Items</span>
                          <span className="text-lg font-black text-blue-600">{selectedCommissions.length}</span>
                        </div>
                      </div>

                      <button
                        onClick={handlePayCommissions}
                        disabled={selectedCommissions.length === 0 || loading}
                        className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-bold text-lg hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-300 transition-all flex justify-center items-center gap-3 shadow-2xl shadow-slate-200 active:scale-95"
                      >
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle size={22} />}
                        Confirmar Pago
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
      return (
          <div className="p-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">Registro de Pagos</h1>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg max-w-xl mx-auto">
                  <div className="flex items-center gap-4 mb-4 border-b pb-4">
                      <Receipt size={32} className="text-indigo-600" />
                      <h2 className="text-xl font-bold text-gray-700">Registrar Cuota de Préstamo</h2>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700">Seleccionar Préstamo</label>
                        <select
                            name="loan_id"
                            value={paymentFormData.loan_id || ""} // Asegura que no sea undefined
                            onChange={handlePaymentInputChange}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none bg-white text-gray-800"
                        >
                            <option value="">-- Seleccione un cliente activo --</option>
                            
                            {/* Usamos loans directamente si activeLoansList falla */}
                            {(activeLoansList.length > 0 ? activeLoansList : loans).map((loan) => (
                                <option key={loan.id} value={loan.id}>
                                    {loan.clientes?.nombre} (Saldo: ${loan.saldo_pendiente?.toLocaleString()})
                                </option>
                            ))}
                        </select>
                        {(activeLoansList.length === 0 && loans.length === 0) && (
                            <p className="text-red-500 text-xs mt-1 italic">No se encontraron préstamos activos en la base de datos.</p>
                        )}
                      </div>
                      <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">Monto a Pagar</label>
                          <div className="relative">
                              <span className="absolute left-4 top-3.5 text-gray-500 font-bold">$</span>
                              <input
                                  type="number"
                                  name="monto_pago"
                                  placeholder="0.00"
                                  value={paymentFormData.monto_pago}
                                  onChange={handlePaymentInputChange}
                                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                              />
                          </div>
                          <p className="text-xs text-gray-400 italic">
                              * Se ha sugerido el valor de la cuota programada.
                          </p>
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
                formatInputCurrency={formatInputCurrency}
                cleanCurrencyInput={cleanCurrencyInput}
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
              <span className="text-xs font-semibold">Usuarios</span>
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

const SettingsPage = ({ totalCapital, onUpdateCapital, loading, formatCurrency, saldoDisponible, totalSaldoPendiente, formatInputCurrency, cleanCurrencyInput }) => {
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
            Swal.fire({ title: 'Error', text: 'Por favor, ingresa un valor numérico válido para el capital.', icon: 'error', confirmButtonText: 'Entendido' })
        }
    };

    const isDisabled = loading || 
        parseFloat(newCapital) === totalCapital || 
        !newCapital || 
        parseFloat(newCapital) <= 0;

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

            {/* NUEVA TARJETA MEJORADA */}
            <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-3xl shadow-2xl border border-gray-100">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 bg-red-100 rounded-xl">
                            <RefreshCw className="text-red-600" size={24} />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800">
                            Actualizar Capital Invertido
                        </h3>
                    </div>
                    <p className="text-gray-500 text-sm ml-14">
                        Actualiza el monto total de capital disponible para préstamos
                    </p>
                </div>

                {/* Current Capital Display */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-5 rounded-2xl mb-6 border border-red-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <TrendingUp className="text-red-600" size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                                    Capital Actual
                                </p>
                                <p className="text-3xl font-bold text-red-600">
                                    {formatCurrency(totalCapital)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input Section */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="newCapitalInput" className="block text-sm font-semibold text-gray-700 mb-2">
                            Nuevo Capital
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <DollarSign className="text-gray-400" size={20} />
                            </div>
                            <input
                                id="newCapitalInput"
                                type="text"
                                value={formatInputCurrency(newCapital)}
                                onChange={handleInputChange}
                                placeholder="Ej. $ 30.000.000"
                                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 text-lg font-medium focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition-all placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={isDisabled}
                        className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="animate-spin" size={20} />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={20} />
                                Guardar Capital
                            </>
                        )}
                    </button>
                </div>

                {/* Helper Text */}
                {newCapital && parseFloat(newCapital) !== totalCapital && parseFloat(newCapital) > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <span className="font-semibold">Cambio: </span>
                            {formatCurrency(totalCapital)} → {formatCurrency(parseFloat(newCapital))}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoanAdminApp;