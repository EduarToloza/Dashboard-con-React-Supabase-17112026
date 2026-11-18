
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase'

function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [imagenes, setImagenes] = useState([])
  const [nuevaUrl, setNuevaUrl] = useState('')
  const [favoritos, setFavoritos] = useState([])

  const navigate = useNavigate()

  // 1. Cargar el perfil del usuario autenticado
  useEffect(() => {
    async function cargar() {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        navigate('/login')
        return
      }

      const { data, error: errorPerfil } = await supabase
        .from('usuario')
        .select('*')
        .eq('id', user.id)
        .single()

      if (errorPerfil || !data) {
        console.error('Error al cargar perfil:', errorPerfil?.message)
        return
      }

      setPerfil(data)
      cargarImagenes(user.id)
      cargarFavoritos(user.id)
    }

    cargar()
  }, [navigate])

  // 2. Cargar imágenes del usuario
  const cargarImagenes = async (usuarioId) => {
    const { data, error } = await supabase
      .from('multimedia')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false })

    if (error) {
      console.error('Error al cargar imágenes:', error.message)
      return
    }

    setImagenes(data ?? [])
  }

  // 3. Cargar favoritos del usuario
  const cargarFavoritos = async (usuarioId) => {
    const { data, error } = await supabase
      .from('favoritos')
      .select('id, multimedia_id')
      .eq('usuario_id', usuarioId)

    if (error) {
      console.error('Error al cargar favoritos:', error.message)
      return
    }

    setFavoritos(data ?? [])
  }

  // 4. Agregar una imagen a favoritos
  const agregarFavorito = async (multimediaId) => {
    if (!perfil) return

    const yaExiste = favoritos.some(
      (favorito) => favorito.multimedia_id === multimediaId
    )

    if (yaExiste) return

    const { error } = await supabase
      .from('favoritos')
      .insert({
        usuario_id: perfil.id,
        multimedia_id: multimediaId,
      })

    if (error) {
      console.error('Error al agregar favorito:', error.message)
      alert('No se pudo agregar el favorito')
      return
    }

    await cargarFavoritos(perfil.id)
  }

  // 5. Eliminar una imagen de favoritos
  const eliminarFavorito = async (multimediaId) => {
    if (!perfil) return

    const { error } = await supabase
      .from('favoritos')
      .delete()
      .eq('usuario_id', perfil.id)
      .eq('multimedia_id', multimediaId)

    if (error) {
      console.error('Error al eliminar favorito:', error.message)
      alert('No se pudo eliminar el favorito')
      return
    }

    await cargarFavoritos(perfil.id)
  }

  // 6. Actualizar datos del formulario
  const handleChange = (e) => {
    setPerfil({
      ...perfil,
      [e.target.name]: e.target.value,
    })
  }

  // 7. Guardar cambios del perfil
  const guardar = async () => {
    if (!perfil) return

    const { error } = await supabase
      .from('usuario')
      .update({
        nombre: perfil.nombre,
        fecha_nacimiento: perfil.fecha_nacimiento,
        telefono: perfil.telefono,
      })
      .eq('id', perfil.id)

    alert(error ? 'No se pudo guardar' : 'Datos actualizados')
  }

  // 8. Agregar una imagen
  const agregarImagen = async () => {
    if (!perfil || !nuevaUrl.trim()) return

    const { error } = await supabase
      .from('multimedia')
      .insert({
        url: nuevaUrl.trim(),
        usuario_id: perfil.id,
      })

    if (error) {
      console.error('Error al agregar imagen:', error.message)
      alert('No se pudo agregar la imagen')
      return
    }

    setNuevaUrl('')
    await cargarImagenes(perfil.id)
  }

  // 9. Eliminar una imagen
  const borrarImagen = async (id) => {
    const { error } = await supabase
      .from('multimedia')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error al eliminar imagen:', error.message)
      alert('No se pudo eliminar la imagen')
      return
    }

    setImagenes(imagenes.filter((img) => img.id !== id))

    // La relación ON DELETE CASCADE elimina su favorito asociado
    setFavoritos(
      favoritos.filter((fav) => fav.multimedia_id !== id)
    )
  }

  // 10. Cerrar sesión
  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert('No se pudo cerrar la sesión')
      return
    }

    navigate('/login')
  }

  if (!perfil) {
    return <p className="p-4">Cargando...</p>
  }

  return (
    <div className="container py-4">

      {/* Encabezado del perfil */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 mb-0">
          Hola, {perfil.nombre}
        </h2>

        <div className="d-flex gap-2">
          {perfil.rol === 'admin' && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/dashboard')}
            >
              Ir al dashboard
            </button>
          )}

          <button
            className="btn btn-outline-secondary"
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Información personal */}
      <div className="card mb-4">
        <div className="card-body row g-3">

          <div className="col-md-6">
            <label className="form-label">Nombre</label>
            <input
              className="form-control"
              name="nombre"
              value={perfil.nombre}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Correo</label>
            <input
              className="form-control"
              value={perfil.correo}
              disabled
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">
              Fecha de nacimiento
            </label>
            <input
              className="form-control"
              type="date"
              name="fecha_nacimiento"
              value={perfil.fecha_nacimiento ?? ''}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Teléfono</label>
            <input
              className="form-control"
              name="telefono"
              value={perfil.telefono ?? ''}
              onChange={handleChange}
            />
          </div>

          <div className="col-12">
            <button
              className="btn btn-primary"
              onClick={guardar}
            >
              Guardar cambios
            </button>
          </div>

        </div>
      </div>

      {/* Galería de imágenes */}
      <h3 className="h5">Mis imágenes</h3>

      <div className="input-group mb-3">
        <input
          className="form-control"
          placeholder="URL de la imagen"
          value={nuevaUrl}
          onChange={(e) => setNuevaUrl(e.target.value)}
        />

        <button
          className="btn btn-primary"
          onClick={agregarImagen}
        >
          Agregar
        </button>
      </div>

      {/* Contador de favoritos */}
      <div className="alert alert-light border mb-3">
        Favoritos seleccionados: <strong>{favoritos.length}</strong>
      </div>

      {/* Imágenes con botones de favoritos */}
      <div className="row row-cols-2 row-cols-md-3 g-3">

        {imagenes.map((img) => {
          const esFavorito = favoritos.some(
            (fav) => fav.multimedia_id === img.id
          )

          return (
            <div className="col" key={img.id}>
              <div className="card h-100">

                <img
                  src={img.url}
                  className="card-img-top"
                  alt="Imagen del usuario"
                />

                <div className="card-body p-2 d-grid gap-2">

                  {esFavorito ? (
                    <button
                      className="btn btn-sm btn-warning"
                      onClick={() => eliminarFavorito(img.id)}
                    >
                      ★ Quitar de favoritos
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => agregarFavorito(img.id)}
                    >
                      ☆ Agregar a favoritos
                    </button>
                  )}

                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => borrarImagen(img.id)}
                  >
                    Eliminar
                  </button>

                </div>
              </div>
            </div>
          )
        })}

      </div>

    </div>
  )
}

export default Perfil
