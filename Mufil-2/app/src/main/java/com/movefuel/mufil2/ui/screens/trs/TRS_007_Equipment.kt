package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS007EquipmentScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_007",
        title = "Equipment",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_006,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Full gym",null,true)
            MFOptionCard("Dumbbells")
            MFOptionCard("Bodyweight only")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS007EquipmentScreenPreview() {
    MoveFuelTheme { TRS007EquipmentScreen {} }
}
