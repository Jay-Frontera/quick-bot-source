import { Client, Collection, IntentsBitField, EmbedBuilder } from 'discord.js';
import { readdirSync } from 'fs';

class jayBot extends Client {
    constructor({ token, commandsPath, eventsPath }) {
        super({
            intents: new IntentsBitField().add(
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.MessageContent,
                IntentsBitField.Flags.GuildMembers
            )
        })

        this.token = token;
        this.commandsPath = commandsPath;
        this.eventsPath = eventsPath;
        this.userIntents = new IntentsBitField()

        this.commandFiles = [];
        this.eventFiles = [];
        this.eventNames = [];

        this.commands = new Collection()
        this.events = new Collection()
    }

    useDefaultIntents() {
        this.userIntents.add(
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.MessageContent,
            IntentsBitField.Flags.GuildMembers
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

            const command = await import('../../' + commander);

            this.commands.set(command.data.name, command);
        }
    }

    async useEvents() {
        this.eventFiles = readdirSync(this.eventsPath)
            .filter((file) => file.endsWith(".js"));

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

        this.on('interactionCreate', interaction => {
            if (interaction.isCommand()) {
                if (!interaction.member.permissions.has("Administrator")) return
                return this.commands.get(interaction.commandName)?.run(interaction, this)
            }
        })

        console.log(this.events)

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