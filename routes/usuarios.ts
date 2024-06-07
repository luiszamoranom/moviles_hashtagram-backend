import { Router } from 'express';
import {sql} from '../utils/postgresql'
// @ts-ignore
import Joi from 'joi';
import bcrypt from "bcryptjs";


const router = Router();

const schemaRegistrarUsuario = Joi.object({
    email: Joi.string().required(),
    nombre_completo: Joi.string().required().min(3).max(50),
    nombre_usuario: Joi.string().required().min(3).max(50),
    contrasena: Joi.string().required().min(5).max(20),
    imagen_base64: Joi.string().base64(),
    imagen_tipo: Joi.string().min(3).max(4),
})

router.post("/registrar", async (req, res) => {
    const { error } = schemaRegistrarUsuario.validate(req.body);

    if (error) {
        return res.status(400)
            .set('x-mensaje', error.details[0].message)
            .end()
    }

    const nombre_usuario = req.body.nombre_usuario
    const email = req.body.email

    // consultar si viola unique
    const existeUsuario =  await sql`
        SELECT nombre_usuario
        FROM usuario
        WHERE nombre_usuario = ${nombre_usuario} or email=${email}
    `

    if(existeUsuario.length > 0){
        return res.status(409)
        .set('x-mensaje','Ya existe un usuario con ese ese nickname o email')
        .end()
    }
    // si no existe el usuario, continuamos el proceso de registro
    const nombre_completo = req.body.nombre_completo
    const contrasena = req.body.contrasena
    const foto_perfil = req.body.foto_perfil
    const foto_extension = req.body.foto_extension

    const contrasenaHasheada = await bcrypt.hash(contrasena, 10);

    if(foto_extension == null && foto_extension == null){
        await sql`
        INSERT INTO usuario(
            nombre_completo,
            nombre_usuario,
            email,
            contrasena
        )
        VALUES (
            ${nombre_completo},
            ${nombre_usuario},
            ${email},
            ${contrasenaHasheada}
        )`;
    }else if(foto_extension != null && foto_extension != null){
        await sql`
        INSERT INTO usuario(
            nombre_completo,
            nombre_usuario,
            email,
            contrasena,
            foto_perfil,
            foto_extension
        )
        VALUES (
            ${nombre_completo},
            ${nombre_usuario},
            ${email},
            ${contrasenaHasheada},
            ${foto_perfil},
            ${foto_extension}
        )`;
    }else{
        return res.status(409)
        .set('x-mensaje', 'Errore')
        .end()
    }

    return res.status(201)
    .set('x-mensaje', 'Conductor creado éxitosamente')
    .end()
});


router.get("/", async (req, res) => {
    const usuarios = await sql`
        SELECT *
        FROM usuario`;

    if(usuarios.length == 0) {
        return res.status(204)
        .set('x-mensaje', 'No hay usuarios registrados')
        .end()
    }

    return res.status(200).send(usuarios)
});

export default router;