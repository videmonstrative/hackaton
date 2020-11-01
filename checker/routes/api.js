const express = require('express')
const router = express.Router()
const { v4: uuid4 } = require('uuid')
const Docker = require('dockerode')
const fs = require('fs')

const docker = new Docker({socketPath: '/var/run/docker.sock'})

checkCode = (lang, lang_ver, code, samples, callback) => {
    const codeUuid = uuid4()

    let image, command, codeFileName, results = []

    switch (lang) {
        case 'python':
            codeFileName = '/tmp/' + codeUuid + '.py'
            image = 'python'
            command = ['python', codeFileName]
            break
        case 'java':
            codeFileName = '/tmp/' + codeUuid + '.java'
            image = 'openjdk:16-jdk-alpine'
            command = ['java', codeFileName]
            break
        case 'php':
            codeFileName = '/tmp/' + codeUuid + '.php'
            image = 'php'
            command = ['php', codeFileName]
            break
        case 'js':
            codeFileName = '/tmp/' + codeUuid + '.js'
            image = 'node:12.18-alpine3.12'
            command = ['node', codeFileName]
            break
        default:
            throw new Error('The programming language is not defined')
    }

    function resOnStream(res, sampleId) {
        return new Promise(resolve => {
            res.on('stream', async (stdout) => {
                await stdoutOnData(stdout).then((chunk) => {
                    const output = chunk.toString().trim().replace(/[\u0000-\u0003]/g, '').trim()
                    results.push({
                        id: sampleId,
                        output: output
                    })
                    if (results.length === samples.length) callback(results)
                })
            })
        })
    }

    function stdoutOnData(stdout) {
        return new Promise(resolve => {
            stdout.on('data', response => resolve(response));
        });
    }

    async function samplesForEach(sample) {
        const createOptions = {
            Tty: false,
            HostConfig: {
                Binds: ['/tmp:/tmp']
            }
        }
        const cmd = [...command, ...sample.input.split(' ')]
        const res = docker.run(image, cmd, null, createOptions, (err, data, container)  => {
            if (err) throw err
            container.remove()
            //fs.unlink(codeFileName, (err) => {if (err) throw err})
        })
        await resOnStream(res, sample.id).then(resOnStream)
    }

    const writeFileCallback = async (err) => {
        samples.forEach(samplesForEach)
    }

    fs.writeFile(codeFileName, code, 'utf8', writeFileCallback)
}

router.post('/', (req, res, next) => {
    checkCode(req.body.lang, req.body.lang_ver, req.body.code, req.body.samples, (result) => {
        console.log(result)
        res.json({
            success: true,
            return: result
        })
    })
})

module.exports = router
