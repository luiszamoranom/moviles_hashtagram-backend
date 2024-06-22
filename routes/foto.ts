import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';

const prisma = new PrismaClient();
const router = Router();

const schemaSubirFoto = Joi.object({
    propietarioId: Joi.number().integer().required(),
    descripcion: Joi.string().max(50).required(),
    ubicacion: Joi.string().max(30).required(),
    base64: Joi.string().required(),
    hashtags: Joi.array().items(Joi.string().alphanum().min(3).max(10)).unique(),
});

router.post('/subir', async (req, res) => {
    const { error, value } = schemaSubirFoto.validate(req.body);

    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const { propietarioId, descripcion, ubicacion, base64, hashtags } = value;

        const hashtagsIds = await Promise.all(
            hashtags.map(async (etiqueta: string) => {
                const hashtagExistente = await prisma.hashtag.findUnique({
                    where: { etiqueta },
                });

                if (hashtagExistente) {
                    return hashtagExistente.id;
                } else {
                    const nuevoHashtag = await prisma.hashtag.create({
                        data: { etiqueta },
                    });
                    return nuevoHashtag.id;
                }
            })
        );

        const nuevaFoto = await prisma.foto.create({
            data: {
                propietarioId,
                descripcion,
                ubicacion,
                base64,
                hashtags: {
                    create: hashtagsIds.map((hashtagId) => ({ hashtagId })),
                },
            },
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
        });

        return res.status(201).json({
            mensaje: 'Foto subida exitosamente',
            foto: nuevaFoto,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir la foto' });
    }
});

router.get('/', async (req, res) => {
    try {
        const fotos = await prisma.foto.findMany({
            include: {
                propietario: {
                    select: {
                        id: true,
                        nombreUsuario: true, // Puedes seleccionar otros campos del usuario si los necesitas
                    },
                },
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
        });
        res.json(fotos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las fotos' });
    }
});

router.get('/:id', async (req, res) => {
    const fotoId = parseInt(req.params.id);

    try {
        const foto = await prisma.foto.findUnique({
            where: { id: fotoId },
            include: {
                propietario: {
                    select: {
                        id: true,
                        nombreUsuario: true
                    },
                },
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
        });

        if (!foto) {
            return res.status(404).json({ error: 'Foto no encontrada' });
        }

        res.json(foto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la foto' });
    }
});


export default router;