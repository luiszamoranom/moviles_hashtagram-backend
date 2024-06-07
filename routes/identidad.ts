import {Router } from 'express';
import {sql} from '../utils/postgresql'
// @ts-ignore
import Joi from 'joi';
// @ts-ignore
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const schemaLogin = Joi.object({
    nombre_usuario: Joi.string().required().valid(),
    contrasena: Joi.string().required().valid()
})

const router = Router();

router.post("/login", async (req, res) => {
    const { error } = schemaLogin.validate(req.body);

    if (error) {
        return res.status(400)
            .set('x-mensaje', error.details[0].message)
            .end()
    }

    const nombre_usuario = req.body.nombre_usuario
    const contrasena = req.body.contrasena

    const usuarioRegistrado = await sql`
        SELECT rol, contrasena, habilitado
        FROM usuario
        WHERE nombre_usuario=${nombre_usuario}
    `;

    if(usuarioRegistrado.length == 0){
        return res.status(404)
            .set('x-mensaje', 'Usuario no existe.')
            .end()
    }

    if(usuarioRegistrado[0].habilitado == false){
        return res.status(401)
            .set('x-mensaje', 'Usuario deshabilitado.')
            .end()
    }

    const hashAlmacenado = usuarioRegistrado[0].contrasena;
    const contrasenaValida = await bcrypt.compare(contrasena, hashAlmacenado);

    if (!contrasenaValida) {
        return res.status(401)
            .set('x-mensaje', 'Contrasena incorrecta.')
            .end();
    }


    const secretKey = process.env.JWT_SECRET_KEY;
    if(secretKey == undefined){
        return res.status(501)
            .set("x-mensaje", "Error, jwt secrey key en el servidor no definido.")
            .end()
    }

    const usuario_rol = usuarioRegistrado[0].usuario_rol
    const accessToken =  jwt.sign({
        usuario_rol
    },secretKey,{ expiresIn: '1h' })

    // res.header('authorization', accessToken)

    res.status(200)
        .set('x-message','Usuario autenticado.')
        .send(accessToken)
        .end()

})

export default router;