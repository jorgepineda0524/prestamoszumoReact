import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // ¡Asegúrate de que esta ruta sea correcta!
import { X, Save, User, Phone, Check } from 'lucide-react';
import Swal from 'sweetalert2';

const ClientForm = ({ clientToEdit, onSave, onCancel }) => {
    // 1. ESTADO LOCAL DEL FORMULARIO
    const [formData, setFormData] = useState({
        nombre: '',
        cedula: '',
        telefono: '',
        direccion: '',
    });
    const [loading, setLoading] = useState(false);

    // 2. EFECTO PARA CARGAR DATOS SI ESTAMOS EDITANDO
    useEffect(() => {
        if (clientToEdit) {
            setFormData({
                nombre: clientToEdit.nombre || '',
                cedula: clientToEdit.cedula || '',
                telefono: clientToEdit.telefono || '',
                direccion: clientToEdit.direccion || '',
            });
        } else {
            // Limpiar si cambiamos de edición a creación
            setFormData({
                nombre: '',
                cedula: '',
                telefono: '',
                direccion: '',
            });
        }
    }, [clientToEdit]);

    // 3. MANEJO DE CAMBIOS EN LOS INPUTS
    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    // 4. FUNCIÓN PRINCIPAL DE ENVÍO Y GUARDADO/ACTUALIZACIÓN
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Validación básica
        if (!formData.nombre || !formData.cedula || !formData.telefono) {
            Swal.fire({ title: 'Error', text: 'El nombre, cédula y teléfono son obligatorios', icon: 'error', confirmButtonText: 'Entendido' })
            setLoading(false);
            return;
        }

        try {
            let error;
            let result;

            // LÓGICA DE ACTUALIZACIÓN (si clientToEdit existe)
            if (clientToEdit) {
                ({ data: result, error } = await supabase
                    .from('clientes')
                    .update(formData)
                    .eq('id', clientToEdit.id)
                    .select()); // Usar .select() para obtener el registro actualizado
                
                if (!error) {
                    Swal.fire({ title: 'Éxito', text: 'Cliente actualizado con éxito', icon: 'success', timer: 4000, showConfirmButton: false })
                }

            // LÓGICA DE INSERCIÓN (si es un cliente nuevo)
            } else {
                ({ data: result, error } = await supabase
                    .from('clientes')
                    .insert([formData])
                    .select());

                if (!error) {
                    Swal.fire({ title: 'Éxito', text: 'Cliente registrado con éxito', icon: 'success', timer: 4000, showConfirmButton: false })
                }
            }

            if (error) throw error;

            // Llama a la función de guardado en el componente padre para recargar la lista
            onSave(result[0]); 
            onCancel(); // Cerrar el formulario

        } catch (err) {
            console.error('Error al guardar cliente:', err);
            Swal.fire({ title: 'Error', text: `Error al guardar cliente: ${err.message}`, icon: 'error', confirmButtonText: 'Entendido' })
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-xl mt-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
                {clientToEdit ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nombre */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                    <div className="relative">
                        <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            placeholder="Ej. Juan Pérez García"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                </div>

                {/* Cédula */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cédula</label>
                    <div className="relative">
                        <Check size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            name="cedula"
                            value={formData.cedula}
                            onChange={handleInputChange}
                            placeholder="Ej. 1020304050"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                </div>

                {/* Teléfono */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <div className="relative">
                        <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="tel"
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleInputChange}
                            placeholder="Ej. 3105556677"
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                </div>

                {/* Dirección */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input
                        type="text"
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleInputChange}
                        placeholder="Ej. Calle 10 # 20-30"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Botones de Acción */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 transition"
                        disabled={loading}
                    >
                        <X size={20} className="mr-2" />
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg shadow-md hover:bg-indigo-700 transition disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? (
                            'Guardando...'
                        ) : (
                            <>
                                <Save size={20} className="mr-2" />
                                {clientToEdit ? 'Actualizar Cliente' : 'Guardar Cliente'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ClientForm;