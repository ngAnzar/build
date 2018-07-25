import { config } from "../src/config"


async function run() {
    let c1 = await config(
        {
            mode: "development",
            something: true,
            whenMode: {
                "development": {
                    ok: 10,
                    ov: 1
                }
            },
            defines: {
                "DEV_SERVER": (cfg, k, v, i) => {
                    return "DVS_" + i
                }
            }
        },
        {
            whenMode: {
                "development": {
                    ov: 2,
                    merge: "ok"
                }
            }
        }
    )

    console.log(c1)
    console.log(c1.whenMode)
    console.log(c1.defines)
}

run().catch(console.error)
