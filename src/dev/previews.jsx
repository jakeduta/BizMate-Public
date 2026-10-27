import {ComponentPreview, Previews} from '@react-buddy/ide-toolbox'
import {PaletteTree} from './palette'
import AppointmentModal from "@/components/appointments/AppointmentModal.jsx";

const ComponentPreviews = () => {
    return (
        <Previews palette={<PaletteTree/>}>
            <ComponentPreview path="/AppointmentModal">
                <AppointmentModal/>
            </ComponentPreview>
        </Previews>
    )
}

export default ComponentPreviews