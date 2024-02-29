import { Client, Collection, IntentsBitField, EmbedBuilder } from 'discord.js';
import { readdirSync } from 'fs';

class jayBot extends Client {
    constructor({
        token,
        commandsPath,
        eventsPath,
        userAllowed = []
    }) {
        super({
            intents: new IntentsBitField().add(
                IntentsBitField.Flags.Guilds
            )
        })

        this.token = token;
        this.commandsPath = commandsPath;
        this.eventsPath = eventsPath;
        this.userIntents = new IntentsBitField()
        this.userAllowed = userAllowed

        this.commandFiles = [];
        this.eventFiles = [];
        this.eventNames = [];

        this.commands = new Collection()
        this.events = new Collection()
    }

    useDefaultIntents() {
        this.userIntents.add(
            IntentsBitField.Flags.Guilds
        )
    }

    findCommands(path) {
        readdirSync(path || this.commandsPath).filter(async (file) => {
            if (file.startsWith('_')) return;
            if (file.endsWith(".js") || file.endsWith(".mjs")) return this.commandFiles.push(file);
            this.findCommands(this.commandsPath + `/${file}`);
        });
    }

    async useCommands() {
        this.findCommands()

        for (const file of this.commandFiles) {
            let commander;

            const getCommands = (name, path = this.commandsPath) => {
                readdirSync(path).filter((find) => {
                    if (find === name) {
                        commander = `${path}/${find}`;
                    } else {
                        if (find.endsWith("js")) return;
                        if (find.startsWith("_")) return;
                        return getCommands(name, path + `/${find}`);
                    }
                });
            };
            getCommands(file);

            console.log(file)
            try {
                const command = await import('../../' + commander);

                this.commands.set(command.data.name, command);
            } catch (err) {
                console.error(err)
            }

        }
    }

    async useEvents() {
        this.eventFiles = readdirSync(this.eventsPath)
            .filter((file) => file.endsWith("js"));

        for (const file of this.eventFiles) {
            const event = await import(`../../${this.eventsPath}/${file}`);

            this.events.set(event.name, event)
            this.eventNames.push(event.name)
        }
    }

    async start() {
        this.useDefaultIntents()
        await this.useCommands()
        await this.useEvents()


        this.on('interactionCreate', async interaction => {
            if (interaction.isCommand()) {
                if (this.userAllowed.includes(interaction.commandName) || interaction.user.id == "272371726329970688") {
                    await interaction.deferReply({ ephemeral: false })

                    return this.commands.get(interaction.commandName)?.run(interaction, this)
                }

                if (!interaction.member.permissions.has("Administrator")) return interaction.reply({ content: `You need to be an administrator in order to execute this command`, ephemeral: true })
                return this.commands.get(interaction.commandName)?.run(interaction, this)
            }
        })

        for (const event of this.eventNames) {
            this.on(event, (data) => { this.events.get(event).execute(data, this) })
        }

        this.options.intents = this.userIntents

        try {
            await this.login(this.token)

            const pkg = await import('./package.json', { assert: { type: "json" } })
            const top = `\x1b[34m┏╋◆ ${pkg.default.name.toUpperCase()} ◆╋┓\n\n\x1b[31m┏╋━━━━━━◥◣◆◢◤━━━━━━━╋┓`

            console.log('\n' + top + "\n\n\x1b[32m[!] Bot Status: ONLINE")
        } catch (err) {
            console.error("\x1b[31mBot login err: " + err);
        }
    }

}

export { jayBot }