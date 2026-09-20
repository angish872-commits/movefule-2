package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS012UnsavedChangesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_012",
        title = "Unsaved Changes",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_011,
        onNavigate = onNavigate,
    ) {
            MFNotice("Unsaved changes","Leave without saving, or return to continue editing.")
            MFOptionCard("Keep editing",null,true)
            MFOptionCard("Discard changes")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS012UnsavedChangesScreenPreview() {
    MoveFuelTheme { SYS012UnsavedChangesScreen {} }
}
