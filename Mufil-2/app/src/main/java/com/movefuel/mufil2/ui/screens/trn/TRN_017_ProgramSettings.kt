package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN017ProgramSettingsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_017",
        title = "Program Settings",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_016,
        onNavigate = onNavigate,
    ) {
            MFListItem("Training days","Mon · Wed · Sat","Edit")
            MFListItem("Session length","45 min","Edit")
            MFListItem("Equipment","Full gym","Edit")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN017ProgramSettingsScreenPreview() {
    MoveFuelTheme { TRN017ProgramSettingsScreen {} }
}
