// UserForm.jsx
import React, { useState } from 'react';
import { X, ArrowLeft, User, Smartphone, CreditCard, Mail, MapPin, CheckCircle, RefreshCw } from 'lucide-react'; 
import Swal from 'sweetalert2';

const UserForm = ({ isComisionistaMode, clientToEdit, onSaveClient, onSaveComisionista, onCancel, onBackToSelection, loading }) => {
    
    const initialFormState = {
        nombre: clientToEdit?.nombre || '',
        cedula: clientToEdit?.cedula || '',
        telefono: clientToEdit?.telefono || '',
        direccion: clientToEdit?.direccion || '',
        email: clientToEdit?.email || ''
    };
    
    const [formData, setFormData] = useState(initialFormState);
    const isEditing = !!clientToEdit;
    const entityType = isComisionistaMode ? 'Comisionista' : 'Cliente';
    const title = isEditing ? `Editar ${entityType}` : `Nuevo ${entityType}`;

    // CONFIGURACIÓN DE COLORES DINÁMICOS
    // Si es comisionista -> Verde | Si es cliente -> Azul
    const theme = {
        gradient: isComisionistaMode ? 'from-emerald-600 to-teal-400' : 'from-blue-600 to-sky-500',
        accentText: isComisionistaMode ? 'text-emerald-500' : 'text-blue-500',
        accentBg: isComisionistaMode ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700',
        ring: isComisionistaMode ? 'focus:ring-emerald-500/10 focus:border-emerald-500' : 'focus:ring-blue-500/10 focus:border-blue-500',
        shadow: isComisionistaMode ? 'shadow-emerald-200' : 'shadow-blue-200',
        subtext: isComisionistaMode ? 'text-emerald-100' : 'text-blue-100'
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!formData.nombre || !formData.telefono) {
            Swal.fire({ 
                title: 'Atención', 
                text: 'El nombre y teléfono son requeridos.', 
                icon: 'warning',
                confirmButtonColor: isComisionistaMode ? '#059669' : '#3b82f6'
            });
            return;
        }
        isComisionistaMode ? onSaveComisionista(formData) : onSaveClient(formData); 
    };

    const fields = isComisionistaMode 
        ? [
            { name: 'nombre', label: 'Nombre Completo', icon: <User size={18}/> },
            { name: 'cedula', label: 'Identificación / Cédula', icon: <CreditCard size={18}/> },
            { name: 'telefono', label: 'Teléfono de Contacto', icon: <Smartphone size={18}/> },
            { name: 'email', label: 'Correo Electrónico', icon: <Mail size={18}/> }
          ]
        : [
            { name: 'nombre', label: 'Nombre Completo', icon: <User size={18}/> },
            { name: 'cedula', label: 'Identificación / Cédula', icon: <CreditCard size={18}/> },
            { name: 'telefono', label: 'Teléfono de Contacto', icon: <Smartphone size={18}/> },
            { name: 'direccion', label: 'Dirección de Residencia', icon: <MapPin size={18}/> },
            { name: 'email', label: 'Correo Electrónico', icon: <Mail size={18}/> }
          ];
            
    return (
        <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in duration-300">
            {/* Header Dinámico (Verde o Azul) */}
            <div className={`bg-gradient-to-r ${theme.gradient} p-6 text-white flex justify-between items-center shadow-lg`}>
                <div className="flex items-center">
                    {!isEditing && (
                         <button 
                            onClick={onBackToSelection} 
                            className="p-2 mr-3 rounded-full bg-white/20 hover:bg-white/30 transition-all active:scale-90"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                        <p className={`${theme.subtext} text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 flex items-center gap-1`}>
                            <CheckCircle size={10} /> Sistema de Gestión Apex
                        </p>
                    </div>
                </div>
                <button onClick={onCancel} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Cuerpo del Formulario */}
            <form onSubmit={handleFormSubmit} className="p-8 space-y-5 overflow-y-auto bg-slate-50/50">
                {fields.map(field => (
                    <div key={field.name} className="space-y-1.5">
                        <label htmlFor={field.name} className="flex items-center gap-2 text-sm font-bold text-slate-600 ml-1">
                            <span className={theme.accentText}>{field.icon}</span>
                            {field.label}
                            {(field.name === 'nombre' || field.name === 'telefono') && (
                                <span className={`${theme.accentText} font-black`}>*</span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                id={field.name}
                                type={field.name === 'email' ? 'email' : (field.name === 'telefono' ? 'tel' : 'text')}
                                name={field.name}
                                value={formData[field.name]}
                                onChange={handleInputChange}
                                placeholder={`Escribe aquí...`}
                                className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl transition-all placeholder:text-slate-300 text-slate-700 shadow-sm focus:ring-4 focus:outline-none ${theme.ring}`}
                            />
                        </div>
                    </div>
                ))}
                
                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading} 
                        className={`w-full ${theme.accentBg} text-white py-4 rounded-2xl font-bold shadow-xl ${theme.shadow} 
                            transition-all flex justify-center items-center gap-2 text-lg
                            ${loading 
                                ? 'opacity-50 cursor-not-allowed scale-100' 
                                : 'hover:-translate-y-1 active:scale-[0.98]' 
                            }`}
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="animate-spin" size={22} />
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <span>{isEditing ? `Actualizar Datos` : `Crear ${entityType}`}</span>
                        )}
                    </button>
                    
                    {loading && (
                        <p className={`text-center mt-2 text-xs font-bold animate-pulse ${isComisionistaMode ? 'text-emerald-600' : 'text-blue-600'}`}>
                            Guardando en la base de datos, por favor espera...
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
};

export default UserForm;