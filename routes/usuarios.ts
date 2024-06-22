import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const router = Router();

const schemaRegistrarUsuario = Joi.object({
  email: Joi.string().required(),
  nombre_completo: Joi.string().required().min(3).max(50),
  nombre_usuario: Joi.string().required().min(3).max(50),
  contrasena: Joi.string().required().min(5).max(20),
  imagen_base64: Joi.string().base64(),
  imagen_tipo: Joi.string().min(3).max(4),
});

router.post('/registrar', async (req, res) => {
  const { error } = schemaRegistrarUsuario.validate(req.body);

  if (error) {
    return res.status(400).set('x-mensaje', error.details[0].message).end();
  }

  const nombreUsuario = req.body.nombre_usuario;
  const email = req.body.email;

  try {
    const existeUsuario = await prisma.usuario.findFirst({
      where: {
        OR: [{ nombreUsuario }, { email }],
      },
    });

    if (existeUsuario) {
      return res
        .status(409)
        .set('x-mensaje', 'Ya existe un usuario con ese nickname o email')
        .end();
    }

    const nombreCompleto = req.body.nombre_completo;
    const contrasena = req.body.contrasena;
    const fotoPerfil = req.body.imagen_base64;
    const fotoExtension = req.body.imagen_tipo;

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);

    await prisma.usuario.create({
      data: {
        nombreCompleto,
        nombreUsuario,
        email,
        contrasena: contrasenaHasheada,
        fotoPerfil,
        fotoExtension,
      },
    });

    return res
      .status(201)
      .set('x-mensaje', 'Usuario creado éxitosamente')
      .end();
  } catch (error) {
    console.error(error);
    res.status(500).set('x-mensaje', 'Error interno del servidor.').end();
  }
});

router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany();

    if (usuarios.length === 0) {
      return res
        .status(204)
        .set('x-mensaje', 'No hay usuarios registrados')
        .end();
    }

    return res.status(200).send(usuarios);
  } catch (error) {
    console.error(error);
    res.status(500).set('x-mensaje', 'Error interno del servidor.').end();
  }
});

router.get('/:id', async (req, res) => {
  const usuarioId = parseInt(req.params.id);

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      return res.status(404).set('x-mensaje', 'Usuario no encontrado').end();
    }

    return res.status(200).send(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).set('x-mensaje', 'Error interno del servidor.').end();
  }
});

const schemaActualizarUsuario = Joi.object({
  nombreCompleto: Joi.string().min(3).max(20),
  nombreUsuario: Joi.string().min(3).max(20),
  descripcion: Joi.string().max(100),
  email: Joi.string().email().max(50),
  contrasena_actual: Joi.string().min(5).max(20),
  nueva_contrasena: Joi.string().min(5).max(20),
  fotoPerfil: Joi.string().base64(),
  fotoExtension: Joi.string().min(3).max(4),
  habilitado: Joi.boolean(),
});

router.put('/:id', async (req, res) => {
  const { error } = schemaActualizarUsuario.validate(req.body);
  const usuarioId = parseInt(req.params.id);

  if (error) {
    return res.status(400).set('x-mensaje', error.details[0].message).end();
  }

  try {
    const usuarioActual = await prisma.usuario.findUnique({ where: { id: usuarioId } });

    if (!usuarioActual) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (req.body.email && req.body.email !== usuarioActual.email) {
      const usuarioConEmail = await prisma.usuario.findUnique({ where: { email: req.body.email } });
      if (usuarioConEmail) {
        return res.status(409).json({ error: 'El email ya está en uso por otro usuario.' });
      }
    }

    if (req.body.nombreUsuario && req.body.nombreUsuario !== usuarioActual.nombreUsuario) {
      const usuarioConNombreUsuario = await prisma.usuario.findUnique({ where: { nombreUsuario: req.body.nombreUsuario } });
      if (usuarioConNombreUsuario) {
        return res.status(409).json({ error: 'El nombre_usuario ya está en uso por otro usuario.' });
      }
    }

    if (req.body.contrasena_actual) {
      const contrasenaValida = await bcrypt.compare(
          req.body.contrasena_actual,
          usuarioActual.contrasena
      );

      if (!contrasenaValida) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }
    }

    let nuevaContrasenaHasheada = usuarioActual.contrasena;
    if (req.body.nueva_contrasena) {
      nuevaContrasenaHasheada = await bcrypt.hash(req.body.nueva_contrasena, 10);
    }

    const usuarioActualizado = await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nombreCompleto: req.body.nombreCompleto || usuarioActual.nombreCompleto,
        nombreUsuario: req.body.nombreUsuario || usuarioActual.nombreUsuario,
        descripcion: req.body.descripcion || usuarioActual.descripcion,
        email: req.body.email || usuarioActual.email,
        contrasena: nuevaContrasenaHasheada,
        fotoPerfil: req.body.fotoPerfil || usuarioActual.fotoPerfil,
        fotoExtension: req.body.fotoExtension || usuarioActual.fotoExtension,
        habilitado: req.body.habilitado ?? usuarioActual.habilitado,
      },
    });

    return res
        .status(200)
        .json({ mensaje: 'Usuario actualizado éxitosamente', usuario: usuarioActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

router.get('/informacion-con-fotos/:id', async (req, res) => {
  const usuarioId = parseInt(req.params.id);

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        fotos: {
          include: {
            hashtags: {
              select: {
                hashtag: {
                  select: {
                    etiqueta: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
});

export default router;