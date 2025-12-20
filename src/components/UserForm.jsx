import React, { useState, useEffect } from 'react';
import { User, CreditCard, Phone, MapPin, Mail, X, Check, ArrowLeft, RefreshCw, Sparkles, UserPlus } from 'lucide-react';

const UserForm = ({ isComisionistaMode, clientToEdit, onSaveClient, onSaveComisionista, loading, onCancel, onBackToSelection }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        cedula: '',
        telefono: '',
        direccion: '',
        email: ''
    });

    useEffect(() => {
        if (clientToEdit) {
            setFormData({
                nombre: clientToEdit.nombre || '',
                cedula: clientToEdit.cedula || '',
                telefono: clientToEdit.telefono || '',
                direccion: clientToEdit.direccion || '',
                email: clientToEdit.email || ''
            });
        }
    }, [clientToEdit]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isComisionistaMode) {
            onSaveComisionista(formData);
        } else {
            onSaveClient(formData);
        }
    };

    return (
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in duration-300 border border-slate-100 relative">

            {/* Header con gradiente suave y tipografía Apex */}
            <div className="p-8 pb-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={onBackToSelection}
                        className="bg-slate-100 p-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                        type="button"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sistema de Registro</span>
                    </div>
                    <button
                        onClick={onCancel}
                        className="bg-slate-100 p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="text-center">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
                        {clientToEdit ? 'Actualizar' : 'Nuevo'}{' '}
                        <span className={isComisionistaMode ? 'text-emerald-500' : 'text-blue-600'}>
                            {isComisionistaMode ? 'Comisionista' : 'Cliente'}
                        </span>
                    </h2>
                    <div className={`h-1 w-12 mx-auto mt-2 rounded-full ${isComisionistaMode ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-5">
                {/* Inputs con estilo minimalista y profesional */}
                <div className="space-y-4">
                    {/* Nombre */}
                    <div className="group">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Nombre del Titular</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                required
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                placeholder="Escribe el nombre completo"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Cédula */}
                        <div className="group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Identificación</label>
                            <div className="relative">
                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={18} />
                                <input
                                    name="cedula"
                                    value={formData.cedula}
                                    onChange={handleChange}
                                    placeholder="Número de cédula"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold"
                                />
                            </div>
                        </div>

                        {/* Teléfono */}
                        <div className="group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Línea Móvil</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={18} />
                                <input
                                    required
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    placeholder="300 000 0000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dirección (Solo Clientes) */}
                    {!isComisionistaMode && (
                        <div className="group">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-1.5 block">Dirección de Cobro</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={18} />
                                <input
                                    name="direccion"
                                    value={formData.direccion}
                                    onChange={handleChange}
                                    placeholder="Ubicación de residencia"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all font-bold"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Botón de Acción Principal */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-5 rounded-[22px] font-black text-white uppercase tracking-[0.15em] text-sm shadow-xl transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-3 ${isComisionistaMode
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-200'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-200'
                            }`}
                    >
                        {loading ? (
                            <RefreshCw size={20} className="animate-spin" />
                        ) : (
                            <>
                                <Check size={20} strokeWidth={3} />
                                {clientToEdit ? 'Guardar Cambios' : `Registrar ${isComisionistaMode ? 'Socio' : 'Cliente'}`}
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Footer sutil */}
            <div className="p-5 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Administración de Activos Apex</p>
            </div>
        </div>
    );
};

export default UserForm;